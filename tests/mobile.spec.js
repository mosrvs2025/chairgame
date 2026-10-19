import {test, expect} from '@playwright/test';

async function deploy(page) {
  await page.goto('/');
  await page.locator('#campaign-grid .primary-cta').first().tap();
  await expect(page.locator('#touch-controls')).toBeVisible();
  await expect.poll(() => page.evaluate(() => chairGame.mode)).toBe('playing');
}
async function point(page, selector) {
  const r = await page.locator(selector).boundingBox();
  return {x:r.x+r.width/2, y:r.y+r.height/2};
}
async function touch(cdp, type, points) {
  await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({...p,radiusX:4,radiusY:4,force:1}))});
}

test.describe('phone touch gameplay',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  test('movement, multitouch freeze, dash, release, cancellation, pause and resume',async({page,context})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await deploy(page);
    const cdp=await context.newCDPSession(page);
    const stick=await point(page,'#touch-stick');
    const freeze=await point(page,'[data-code="Space"]');
    const dash=await point(page,'[data-code="ShiftLeft"]');
    const start=await page.evaluate(()=>chairGame.player.pos.x);
    const finger={...stick,id:1};
    await touch(cdp,'touchStart',[finger]);
    finger.x+=35;
    await touch(cdp,'touchMove',[finger]);
    await expect.poll(()=>page.evaluate(()=>chairGame.player.pos.x)).toBeGreaterThan(start+.5);
    await touch(cdp,'touchStart',[finger,{...freeze,id:2}]);
    await expect.poll(()=>page.evaluate(()=>chairGame.player.isFrozenDisguise)).toBe(true);
    await touch(cdp,'touchEnd',[{...freeze,id:2}]);
    await expect.poll(()=>page.evaluate(()=>chairGame.player.isFrozenDisguise)).toBe(false);
    await touch(cdp,'touchStart',[finger,{...dash,id:3}]);
    await expect.poll(()=>page.evaluate(()=>chairGame.player.dashCooldown)).toBeGreaterThan(0);
    await touch(cdp,'touchEnd',[{...dash,id:3}]);
    await touch(cdp,'touchCancel',[]);
    await expect.poll(()=>page.evaluate(()=>chairGame.input.move.x)).toBe(0);
    await expect.poll(()=>page.evaluate(()=>Object.values(chairGame.input.touchKeys).some(Boolean))).toBe(false);
    await page.locator('#btn-pause-hud').tap();
    await expect(page.locator('#pause-modal')).toBeVisible();
    const pos=await page.evaluate(()=>chairGame.player.pos.toArray());
    await page.waitForTimeout(350);
    expect(await page.evaluate(()=>chairGame.player.pos.toArray())).toEqual(pos);
    await page.locator('#btn-resume').tap();
    await expect(page.locator('#touch-controls')).toBeVisible();
    expect(errors).toEqual([]);
  });
  test('touch abilities work with campaign mechanics and a sit can be harvested',async({page})=>{
    await deploy(page);
    await page.locator('[data-code="KeyQ"]').tap();
    expect(await page.evaluate(()=>chairGame.player.trapMode)).toBe('catapult');
    await page.locator('[data-code="KeyQ"]').tap();
    // Arrange a deterministic nearby rival; activation still uses real touch input.
    await page.evaluate(()=>{
      const g=chairGame;g.rivalChairs[0].pos.copy(g.player.pos);g.rivalChairs[0].pos.x+=1;
    });
    await page.locator('[data-code="KeyE"]').tap();
    await expect.poll(()=>page.evaluate(()=>chairGame.sabotagesDone)).toBe(1);
    await page.locator('[data-code="KeyR"]').tap();
    await expect.poll(()=>page.evaluate(()=>chairGame.player.specialCooldown)).toBeGreaterThan(0);
    // Arrange a lowering pedestrian directly over the chair, then let game AI seat and harvest them.
    await page.evaluate(()=>{
      const g=chairGame;g.npcs.filter(n=>n.role==='janitor').forEach(n=>n.stun(30));
      const n=g.npcs.find(n=>n.role==='patron');n.pos.copy(g.player.pos);n.suspicion=0;n.triggerLoweringHere(1);
    });
    await expect.poll(()=>page.evaluate(()=>chairGame.sitsHarvested),{timeout:45000}).toBeGreaterThan(0);
    await page.evaluate(()=>{
      const g=chairGame;const n=g.npcs.find(n=>n.role==='patron');
      n.pos.copy(g.player.pos);n.suspicion=0;n.triggerLoweringHere(1);
    });
    await expect.poll(()=>page.evaluate(()=>Boolean(chairGame.player.occupiedBy))).toBe(true);
    await page.locator('[data-code="KeyQ"]').tap();
    await expect.poll(()=>page.evaluate(()=>chairGame.catapultsLaunched)).toBe(1);
    await page.locator('#btn-open-workshop-hud').tap();
    await expect(page.locator('#workshop-modal')).toBeVisible();
    await expect(page.locator('#touch-controls')).toBeHidden();
    await page.locator('.evo-card').filter({hasText:'AeroMesh 9000'}).locator('button').tap();
    await expect.poll(()=>page.evaluate(()=>chairGame.saveData.unlockedForms.includes('swivel'))).toBe(true);
    await expect.poll(()=>page.evaluate(()=>chairGame.player.currentFormId)).toBe('swivel');
    await page.locator('#btn-close-workshop').tap();
    await expect(page.locator('#touch-controls')).toBeVisible();
  });
});

for(const size of [{width:320,height:568},{width:844,height:390},{width:768,height:1024}]){
  test(`touch layout fits ${size.width}x${size.height}`,async({browser})=>{
    const context=await browser.newContext({viewport:size,isMobile:true,hasTouch:true});
    const page=await context.newPage();await deploy(page);
    for(const selector of ['#touch-stick','[data-code="Space"]','[data-code="ShiftLeft"]','#btn-pause-hud']){
      const r=await page.locator(selector).boundingBox();expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(size.width);expect(r.y+r.height).toBeLessThanOrEqual(size.height);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.screenshot({path:`test-results/touch-${size.width}x${size.height}.png`});
    await context.close();
  });
}
test('desktop keyboard movement and pause still work',async({page})=>{
  await page.addInitScript(() => Object.defineProperty(navigator, 'maxTouchPoints', {get:()=>0}));
  await page.setViewportSize({width:1440,height:900});await page.goto('/');
  await page.locator('#campaign-grid .primary-cta').first().click();
  expect(await page.locator('#touch-controls').isVisible()).toBe(false);
  const x=await page.evaluate(()=>chairGame.player.pos.x);await page.keyboard.down('d');
  await expect.poll(()=>page.evaluate(()=>chairGame.player.pos.x)).toBeGreaterThan(x+.5);
  await page.keyboard.up('d');await page.keyboard.press('Escape');await expect(page.locator('#pause-modal')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('#pause-modal')).toBeHidden();
});

