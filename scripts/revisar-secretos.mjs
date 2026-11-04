// Revisa que no haya secretos en el repositorio (pf23).
//
//   npm run seguridad:secretos               → archivos versionados + dist/ si existe
//   npm run seguridad:secretos -- --historial → además, TODO el historial de Git
//
// Termina con código 1 si encuentra algo, para que la integración continua
// (pf24) marque el check en rojo. Nunca imprime el secreto completo.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { buscarSecretos, esArchivoDeSecretos } from './seguridad/detectores.js'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
const BINARIO = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|bin|wasm|y4m|zip|pdf)$/i
const hallazgos = []

// 1. Ningún .env real versionado.
const versionados = git('ls-files').split('\n').filter(Boolean)
for (const ruta of versionados.filter(esArchivoDeSecretos)) {
  hallazgos.push({ origen: ruta, tipo: 'Archivo .env versionado en Git', linea: '-', valor: '' })
}

// 2. Contenido de los archivos versionados.
for (const ruta of versionados) {
  if (BINARIO.test(ruta) || ruta.endsWith('package-lock.json') || !existsSync(ruta)) continue
  for (const h of buscarSecretos(readFileSync(ruta, 'utf8'))) hallazgos.push({ origen: ruta, ...h })
}

// 3. El build del front: todo lo que hay en dist/ lo descarga cualquier visitante.
const recorrer = (carpeta) =>
  readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre)
    return statSync(ruta).isDirectory() ? recorrer(ruta) : [ruta]
  })
if (existsSync('dist')) {
  for (const ruta of recorrer('dist').filter((r) => /\.(js|html|css|map)$/.test(r))) {
    for (const h of buscarSecretos(readFileSync(ruta, 'utf8'))) hallazgos.push({ origen: ruta, ...h })
  }
}

// 4. Historial completo: un secreto borrado en un commit posterior sigue en Git.
if (process.argv.includes('--historial')) {
  const commits = git('rev-list', '--all').split('\n').filter(Boolean)
  const vistos = new Set()
  for (const commit of commits) {
    const parche = git('show', '--format=', '--no-color', '--unified=0', commit)
    for (const h of buscarSecretos(parche)) {
      const clave = `${h.tipo}|${h.valor}`
      if (vistos.has(clave)) continue
      vistos.add(clave)
      hallazgos.push({ origen: `commit ${commit.slice(0, 7)}`, ...h, linea: '-' })
    }
  }
  const archivosEnv = git('log', '--all', '--name-only', '--format=').split('\n').filter((r) => r && esArchivoDeSecretos(r))
  for (const ruta of new Set(archivosEnv)) {
    hallazgos.push({ origen: 'historial', tipo: `Archivo .env alguna vez versionado: ${ruta}`, linea: '-', valor: '' })
  }
  console.log(`Historial revisado: ${commits.length} commits.`)
}

if (hallazgos.length === 0) {
  console.log(`✔ Sin secretos en ${versionados.length} archivos versionados${existsSync('dist') ? ' ni en dist/' : ''}.`)
} else {
  console.log(`✘ ${hallazgos.length} posibles secretos:`)
  console.table(hallazgos)
  console.log('Si es real: quitalo del archivo, REGENERÁ la credencial en su servicio y movela a un .env ignorado.')
  process.exitCode = 1
}
