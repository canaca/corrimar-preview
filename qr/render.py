import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--allow-file-access-from-files'])
        p=await b.new_page(viewport={'width':1400,'height':900},device_scale_factor=1)
        await p.goto('file://'+HERE+'/preview.html'); await p.wait_for_timeout(800)
        await p.screenshot(path=HERE+'/sticker-preview.png',full_page=True)
        for name,d in [('sticker-1.5in-round',1.5),('sticker-2in-round',2)]:
            px=int(d*600)  # 600 dpi raster for decode checks / proofs
            q=await b.new_page(viewport={'width':px,'height':px})
            await q.goto(f'file://{HERE}/preview.html')
            await q.evaluate(f'''document.body.innerHTML='<img src="{name}.svg" style="width:{px}px;height:{px}px;display:block">';document.body.style.cssText='margin:0;background:#fff' ''')
            await q.wait_for_timeout(700)
            await q.screenshot(path=f'{HERE}/{name}-600dpi.png')
        await b.close()
asyncio.run(main())
