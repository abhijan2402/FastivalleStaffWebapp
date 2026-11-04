import{test,expect}from'@playwright/test';
import qrcode from 'qrcode-generator'
// Feed a real QR image through a camera stream so tests exercise decoding.
async function scanCard(page, code) {
  const qr = qrcode(0, 'M')
  qr.addData(code)
  qr.make()
  await page.evaluate(async dataUrl => {
    const image = new Image()
    image.src = dataUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 400
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 400, 400)
    ctx.drawImage(image, 40, 40, 320, 320)
    navigator.mediaDevices.getUserMedia = async () => {
      const stream = canvas.captureStream(10)
      const timer = setInterval(() => {
        if (stream.getVideoTracks()[0].readyState === 'ended') { clearInterval(timer); return }
        ctx.drawImage(image, 40, 40, 320, 320)
      }, 100)
      return stream
    }
  }, qr.createDataURL(8, 4))
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test.beforeEach(async({page})=>{page.on('pageerror',error=>console.log('PAGE ERROR',error.message));page.on('requestfailed',request=>console.log('REQUEST FAILED',request.url(),request.failure()?.errorText));});
test('agent registers, prints a valid QR card and records one serving',async({page})=>{await page.goto('/');await expect(page.getByRole('heading',{name: /^Dashboard$/})).toBeVisible();await page.getByRole('button',{name:'Register a family'}).click();await page.getByLabel('Receiver name').fill('Test Receiver');await page.getByLabel('Mobile number').fill('9876543210');await page.getByLabel('Email (optional)').fill('receiver@example.com');await page.getByRole('button',{name:'Add another member'}).click();await page.getByPlaceholder('Member’s full name').fill('Test Child');await page.getByLabel('Relation to receiver').selectOption('Daughter');await page.getByRole('button',{name:'Register family',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Test Receiver');await expect(page.getByRole('dialog')).toContainText('Daughter');await expect(page.getByRole('dialog')).toContainText('9876543210');await expect(page.getByRole('dialog')).toContainText('receiver@example.com');await expect(page.locator('.qr svg')).toBeVisible();await page.getByRole('button',{name:'Close dialog'}).click();await page.getByRole('button',{name:'Scan & serve',exact:true}).last().click();await scanCard(page, 'FV-1024:1');await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByLabel('Food event (today only)').selectOption('FU-008');await page.getByRole('button',{name:'Process food',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Food entry updated');await page.getByRole('button',{name:'Scan next family'}).click();await scanCard(page, 'FV-1024:1');await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByLabel('Food event (today only)').selectOption('FU-008');await expect(page.getByRole('dialog')).toContainText('Already processed');await expect(page.getByRole('button',{name:'Process food',exact:true})).toBeDisabled();await page.screenshot({path:'/tmp/fastivalle-scan.png',fullPage:true})});
test('volunteer login limits navigation to scanning',async({page})=>{await page.goto('/');await page.getByRole('button',{name:'Your profile'}).click();await page.getByRole('button',{name:'Switch demo account'}).click();await page.locator('[data-action="fill:volunteer"]').click();await page.getByRole('button',{name:'Sign in to your workspace'}).click();await expect(page.locator('.sidebar nav')).not.toContainText('Families');await expect(page.locator('.sidebar nav')).not.toContainText('Food units');await expect(page.locator('.scanner-panel')).toBeVisible();await page.reload();await expect(page.locator('.scanner-panel')).toBeVisible()});
test('mobile layout, profile access, offline app shell and persistent serving',async({page,context})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.mobile-nav')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:'/tmp/fastivalle-mobile.png',fullPage:true});await page.getByRole('button',{name:'Your profile'}).click();await expect(page.getByRole('dialog')).toContainText('Your field companion');await page.getByRole('button',{name:'Close dialog'}).click();await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name: /^Dashboard$/})).toBeVisible();await page.locator('.mobile-nav [data-page="scan"]').click();await scanCard(page, 'FV-1025:1');await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByLabel('Food event (today only)').selectOption('FU-008');await page.getByRole('button',{name:'Process food',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Saved offline');await context.setOffline(false);await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('fv-data')).queue.length)).toBe(1)});
test('food unit planning and desktop presentation',async({page})=>{await page.setViewportSize({width:1440,height:1100});await page.goto('/');await page.screenshot({path:'/tmp/fastivalle-desktop.png',fullPage:true});await page.getByRole('button',{name:'Plan a food unit'}).click();await page.getByLabel('Distribution name').fill('New lunch');await page.getByLabel('Number of packs').fill('40');await expect(page.getByLabel('Community')).toHaveCount(0);await page.getByRole('textbox', { name: 'Food items' }).fill('Dal');await page.getByRole('textbox', { name: 'Food items' }).press('Enter');await page.getByRole('textbox', { name: 'Food items' }).fill('Rice');await page.getByRole('button',{name:'Add item',exact:true}).click();await page.getByRole('textbox', { name: 'Food items' }).fill('Salt');await page.getByRole('textbox', { name: 'Food items' }).press('Enter');await page.getByRole('button',{name:'Remove Salt',exact:true}).click();await page.getByLabel('Total cost').fill('2500');await page.getByRole('button',{name:'Create food unit',exact:true}).click();await expect(page.getByRole('heading',{name:'New lunch'})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('fv-data')).units[0].items)).toEqual(['Dal','Rice'])});

test('scan shows details first, records multiple recipients, and lists only current-day events', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hero, .impact-teaser, .kind-note, .activity-panel, .distributions')).toHaveCount(0)
  await page.locator('.sidebar [data-page="scan"]').click()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await scanCard(page, 'FV-1024:1')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('FV-1024')
  await expect(dialog.getByRole('checkbox')).toHaveCount(4)
  await expect(dialog.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await dialog.getByLabel('Rahima Begum').check()
  await dialog.getByLabel('Rafi', { exact: false }).check()
  await dialog.getByRole('button', { name: 'Next', exact: true }).click()
  const choices = dialog.getByLabel('Food event (today only)')
  await expect(choices).not.toContainText('Community breakfast')
  await choices.selectOption('FU-008')
  await expect(dialog).toContainText('2 food packs')
  await dialog.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(dialog.getByLabel('Rahima Begum')).toBeChecked()
  await dialog.getByRole('button', { name: 'Next', exact: true }).click()
  await dialog.getByRole('button', { name: 'Process food', exact: true }).click()
  await expect(dialog).toContainText('Food entry updated')
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('fv-data')))
  expect(data.servings[0].recipients).toEqual(['Rahima Begum', 'Rafi'])
  expect(data.units[0].served).toBe(126)
  expect(data.total).toBe(1250)
})

test('family details remain available when no events are scheduled today', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('fv-data'))
    data.units.forEach(unit => { unit.date = '2000-01-01' })
    localStorage.setItem('fv-data', JSON.stringify(data))
  })
  await page.reload()
  await page.locator('.sidebar [data-page="scan"]').click()
  await scanCard(page, 'FV-1024:1')
  await page.getByLabel('Rahima Begum').check()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('No food events are scheduled for today')
  await expect(page.getByRole('button', { name: 'Process food', exact: true })).toBeDisabled()
})


test('scanner has no extra panels and removed navigation stays absent', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Our impact', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Help & support', exact: true })).toHaveCount(0)
  await expect(page.locator('.role-card')).not.toContainText('community')
  await page.locator('.sidebar [data-page="scan"]').click()
  await expect(page.locator('main .panel')).toHaveCount(1)
  await expect(page.locator('main aside, main .page-heading, main .demo-scan, main .scan-tip')).toHaveCount(0)
  await expect(page.locator('.camera-frame')).toBeVisible()
  await expect(page.locator('main input, main form, main .divider-label')).toHaveCount(0)
  await expect(page.getByText('Your serving activity')).toHaveCount(0)
  await page.getByRole('button', { name: 'Your profile' }).click()
  await expect(page.getByRole('button', { name: 'Help & support', exact: true })).toHaveCount(0)
})

test('receiver can register without optional contact information or extra members', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Register a family', exact: true }).click()
  await expect(page.getByLabel('Community')).toHaveCount(0)
  await page.getByLabel('Receiver name').fill('Solo Receiver')
  await page.getByRole('button', { name: 'Register family', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Solo Receiver')
  const family = await page.evaluate(() => JSON.parse(localStorage.getItem('fv-data')).families[0])
  expect(family.mobile).toBe('')
  expect(family.email).toBe('')
  expect(family.members).toEqual([{ name: 'Solo Receiver', relation: 'Self' }])
  expect(family).not.toHaveProperty('area')
})
