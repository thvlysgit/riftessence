const fs = require('fs')
const path = require('path')

async function render() {
  const dotPath = path.resolve(__dirname, '..', 'prisma', 'erd.dot')
  const outPath = path.resolve(__dirname, '..', 'prisma', 'erd.svg')

  if (!fs.existsSync(dotPath)) {
    console.error('DOT file not found. Run `pnpm run generate:erd` first.')
    process.exit(1)
  }

  const dot = fs.readFileSync(dotPath, 'utf8')

  try {
    const Viz = require('viz.js')
    const { Module, render } = require('viz.js/full.render.js')
    const viz = new Viz({ Module, render })
    const svg = await viz.renderString(dot)
    fs.writeFileSync(outPath, svg, 'utf8')
    console.log('Wrote', outPath)
  } catch (err) {
    console.error('Failed to render DOT to SVG:', err.message || err)
    process.exit(1)
  }
}

render()
