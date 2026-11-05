# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

# Plataforma Butaca

[![CI - Integración Continua Butaca](https://github.com/jacastellanoso/butaca/actions/workflows/ci.yml/badge.svg)](https://github.com/jacastellanoso/butaca/actions/workflows/ci.yml)

El estado del pipeline de Integración Continua (CI) refleja en tiempo real la salud integral del proyecto. Cada confirmación (`push`) y solicitud de extracción (`pull request`) ejecutada sobre las ramas `dev`, `main` o ramas funcionales `pf*` activa un flujo automatizado en GitHub Actions que valida:
- Análisis estático de código y reglas de estilo (`npm run lint`).
- Compilación del frontend para producción (`npm run build`).
- Escaneo de seguridad y detección de secretos en código e historial (`scripts/revisar-secretos.mjs`).
- Suite completa de 389 pruebas unitarias y de integración del frontend, API Gateway y microservicios (`npm run test:todo`).
- Suite de 9 pruebas de extremo a extremo (E2E) mediante Playwright con backend y cámara simulados (`npm run e2e`).
- Validación estructural y sintáctica de contenedores Docker Compose (`docker compose config`).

Un badge con estado **passing** (en verde) certifica que la rama cumple con todos los estándares de calidad, seguridad y estabilidad antes de su integración.