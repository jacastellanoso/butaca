// Corre las pruebas unitarias y de integración de todo Butaca y muestra un
// resumen: frontend, API Gateway y los cinco microservicios.
//
//   npm run test:todo              → usa las dependencias ya instaladas
//   npm run test:todo -- --instalar → antes hace `npm ci` en cada paquete
//
// Cada paquete es un proyecto npm independiente (regla 12 de IARECURSO.md),
// por eso se ejecuta `npm test` dentro de su carpeta. Las pruebas de los
// servicios simulan Supabase, Prisma y TMDB: no necesitan .env ni Docker.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const PAQUETES = [
  ['Frontend (React)', '.'],
  ['API Gateway', 'apigateway'],
  ['auth-service', 'microservicios/auth-service'],
  ['emotions-service', 'microservicios/emotions-service'],
  ['catalog-service', 'microservicios/catalog-service'],
  ['recommendations-service', 'microservicios/recommendations-service'],
  ['library-service', 'microservicios/library-service'],
]

const instalar = process.argv.includes('--instalar')
// En Windows npm es npm.cmd; con shell:true se resuelve igual en todas las
// plataformas. El comando va como un solo texto (no como lista de argumentos)
// porque Node 24 advierte (DEP0190) al combinar shell:true con argumentos: no
// se escapan. Aquí todos los argumentos son fijos, nunca vienen del usuario.
const npm = (args, cwd, env = process.env) =>
  spawnSync(`npm ${args.join(' ')}`, { cwd, shell: true, encoding: 'utf8', env: { ...env, FORCE_COLOR: '0' } })

const resumen = []

for (const [nombre, carpeta] of PAQUETES) {
  process.stdout.write(`▶ ${nombre.padEnd(24)} `)

  if (instalar || !existsSync(join(carpeta, 'node_modules'))) {
    const ci = npm(['ci', '--no-audit', '--no-fund'], carpeta)
    if (ci.status !== 0) {
      console.log('✘ falló npm ci')
      resumen.push({ nombre, pruebas: 0, ok: 0, fallas: 0, estado: 'sin dependencias' })
      continue
    }
    // Los servicios con Prisma necesitan su cliente generado para importarse.
    // `prisma generate` no se conecta a la base: si no hay .env basta una URL de relleno.
    if (existsSync(join(carpeta, 'prisma'))) {
      const relleno = 'postgresql://generate:generate@localhost:5432/generate'
      npm(['run', 'prisma:generate'], carpeta, { DATABASE_URL: relleno, DIRECT_URL: relleno, ...process.env })
    }
  }

  const inicio = Date.now()
  const r = npm(['test'], carpeta)
  const salida = `${r.stdout}\n${r.stderr}`
  const leer = (clave) => Number(salida.match(new RegExp(`(?:ℹ|#) ${clave} (\\d+)`))?.[1] ?? 0)
  const fila = {
    nombre,
    pruebas: leer('tests'),
    ok: leer('pass'),
    fallas: leer('fail'),
    segundos: ((Date.now() - inicio) / 1000).toFixed(1),
    estado: r.status === 0 ? 'ok' : 'falla',
  }
  resumen.push(fila)
  console.log(fila.estado === 'ok' ? `✔ ${fila.ok}/${fila.pruebas} (${fila.segundos} s)` : `✘ ${fila.fallas} fallas`)

  if (r.status !== 0) {
    const fallidas = salida.split('\n').filter((l) => /^\s*(✖|not ok)/.test(l)).slice(0, 10)
    console.log(fallidas.map((l) => `    ${l.trim()}`).join('\n'))
  }
}

const total = resumen.reduce((s, f) => s + f.pruebas, 0)
const ok = resumen.reduce((s, f) => s + f.ok, 0)
console.log('\n' + '─'.repeat(52))
console.table(resumen.map(({ nombre, pruebas, ok, fallas, estado }) => ({ paquete: nombre, pruebas, ok, fallas, estado })))
console.log(`Total: ${ok}/${total} pruebas en verde`)

process.exitCode = resumen.every((f) => f.estado === 'ok') ? 0 : 1