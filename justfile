set shell := ["bash", "-cu"]

# Muestra las recetas disponibles
default:
	just --list

# Instala dependencias del proyecto
install:
	npm install

# Levanta el server local en http://localhost:8080
serve:
	npm run serve

# Ejecuta tests E2E (Playwright)
test:
	npm run test

# Ejecuta tests E2E con navegador visible
test-headed:
	npm run test:headed

# Ejecuta flujo de screenshots/manual visual
screenshots:
	npm run manual:screenshots

# Corre validaciones del proyecto
check:
	npm run check

# Pipeline local de CI
ci:
	npm run ci

# Alias útil para correr la app local rápido
dev: serve
