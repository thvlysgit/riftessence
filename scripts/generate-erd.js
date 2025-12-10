const fs = require('fs')
const path = require('path')

const schemaPath = path.resolve(__dirname, '..', 'prisma', 'schema.prisma')
const outPath = path.resolve(__dirname, '..', 'prisma', 'erd.dot')

const schema = fs.readFileSync(schemaPath, 'utf8')

// Very small parser to extract models and relations from schema.prisma
const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g
const fieldRegex = /^(\s*)([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_\[\]\?]+)(.*)$/gm

const models = {}
let m
while ((m = modelRegex.exec(schema)) !== null) {
  const name = m[1]
  const body = m[2]
  const fields = []
  let f
  while ((f = fieldRegex.exec(body)) !== null) {
    const fld = f[2]
    const typ = f[3]
    const rest = f[4].trim()
    fields.push({ name: fld, type: typ, raw: rest })
  }
  models[name] = fields
}

function isRelationType(type) {
  // relation types reference other models (e.g., User, User?, User[])
  const t = type.replace(/[\[\]\?]/g, '')
  return !!models[t]
}

const lines = []
lines.push('digraph PrismaERD {')
lines.push('  graph [rankdir=LR, fontsize=12];')
lines.push('  node [shape=plaintext];')

// nodes
for (const [modelName, fields] of Object.entries(models)) {
  const rows = fields.map((f) => `\t<tr><td align='left'><b>${f.name}</b></td><td align='left'>${f.type}</td></tr>`)
  const label = [`<<table border='0' cellborder='1' cellspacing='0'>`, `  <tr><td colspan='2'><b>${modelName}</b></td></tr>`, ...rows, `</table>>`].join('\n')
  lines.push(`  ${modelName} [label=${label}];`)
}

// edges
for (const [modelName, fields] of Object.entries(models)) {
  for (const f of fields) {
    if (isRelationType(f.type)) {
      const target = f.type.replace(/[\[\]\?]/g, '')
      const arrow = f.type.includes('[]') ? ' [arrowhead=none, dir=both]' : ''
      lines.push(`  ${modelName} -> ${target}${arrow}; // ${f.name}`)
    }
  }
}

lines.push('}')

fs.writeFileSync(outPath, lines.join('\n'))
console.log('Wrote', outPath)
