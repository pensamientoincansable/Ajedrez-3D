# ♟️ Ajedrez 3D Cristalino - Professional Edition

Juego de ajedrez 3D con piezas cristalinas de geometría triangular, motor de ajedrez profesional y multijugador en tiempo real.

## ✨ Características Profesionales

### 🎮 Modos de Juego
- **VS CPU**: Inteligencia artificial con 3 niveles de dificultad
  - 🌱 **Fácil**: Movimientos semi-aleatorios con 40% capturas, ideal principiantes
  - ⚡ **Medio**: Evaluación posicional 1-ply, top 3 movimientos con randomness
  - 🔥 **Difícil**: Minimax con poda alfa-beta profundidad 3 + quiescence search
- **1 vs 1 Local**: Dos jugadores en el mismo dispositivo
- **1 vs 1 Online**: Multijugador en tiempo real con lobby

### 💎 Piezas Cristalinas
- **Geometría triangular precisa**: Icosaedros, tetraedros y octaedros para facetas cristalinas
- **Materiales PBR profesionales**: MeshPhysicalMaterial con transmission, IOR, clearcoat
- **Efectos de cristal**:
  - Blancas: Cristal hielo azulado con transmission 0.65 y emissive sutil
  - Negras: Cristal oscuro con tint morado y transmission 0.35
  - Detalles dorados y rubí con materiales cristalinos
- **Optimizaciones**: Geometry caching, envMap para reflejos, sombras suaves

### ♟️ Motor de Ajedrez Completo (FIDE)
- ✅ Movimientos legales con detección de jaque
- ✅ Enroque corto y largo con validación completa
- ✅ Captura al paso (en passant)
- ✅ Promoción automática a reina
- ✅ Detección de jaque mate y ahogado
- ✅ Tablas por insuficiencia y repetición
- ✅ Historial y notación

### 🌐 Multijugador Online
- **Lobby en tiempo real**: Crear/unirse a salas con código
- **Dos modos de conexión**:
  - WebSocket (servidor Node.js) para internet
  - BroadcastChannel para pestañas locales (sin servidor)
- **Timer profesional**: 20 segundos por movimiento
  - Barra de progreso visual
  - Warning a 10s y 5s
  - Derrota por tiempo
- **Sincronización**: Movimientos, chat, desconexión

### 🎨 UI/UX Profesional
- Menú principal con selección de modo y dificultad
- Sin UI de dificultad durante partida (como solicitado)
- Animaciones fluidas con easing cúbico
- Efectos de captura con desvanecimiento y escala
- Highlights de movimientos legales y último movimiento
- Indicador de jaque con pulsación
- Diseño responsive con glassmorphism

### ⚡ Optimizaciones de Motor de Videojuegos
- **Renderer**: ACESFilmicToneMapping, PCFSoftShadowMap, pixelRatio capped a 2
- **Geometría**: Beveled squares, instanced caching, LOD implícito
- **Iluminación**: 5 luces (ambient, hemi, directional, point sparkles) con sombras optimizadas 2048x2048
- **Materiales**: EnvMap dinámico con CubeCamera para reflejos cristalinos
- **Performance**: AutoClear, powerPreference high-performance, damping en controles
- **Partículas**: Cristales flotantes alrededor del tablero

## 🚀 Instalación y Uso

### Opción 1: Servidor con multijugador completo
```bash
npm install
npm start
# Abre http://localhost:3000
```

### Opción 2: Solo frontend (sin servidor, modo local + BroadcastChannel)
```bash
npx serve .
# o abre index.html directamente
```

## 🎯 Cómo Jugar

1. **Menú Principal**: Elige modo (VS CPU, 1vs1 Local, Online)
2. **Dificultad**: Solo para VS CPU, selecciona Fácil/Medio/Difícil
3. **Lobby Online**:
   - Ingresa tu nombre
   - Crea sala o únete a una existente
   - Comparte código con amigo
   - ¡Juega con 20s por turno!
4. **Durante partida**:
   - Click en pieza para ver movimientos legales
   - Verde = movimiento, Rojo = captura
   - Amarillo = pieza seleccionada

## 🧠 IA - Detalles Técnicos

- **Evaluación**: Material + posicional (piece-square tables) + movilidad + seguridad rey
- **Fácil**: 70% random, 30% capturas, 20% blunders
- **Medio**: 1-ply search, score = -eval(opponent) + captura*10, top 3 random
- **Difícil**: Minimax depth 3, alfa-beta pruning, move ordering (capturas primero), quiescence search solo capturas

## 📁 Estructura
- `index.html` - Menú principal y lobby
- `main.js` - Game loop profesional y estados
- `game-logic.js` - Motor ajedrez completo FIDE
- `pieces.js` - Factory de piezas cristalinas triangulares
- `chess-board.js` - Tablero con materiales PBR y cristales
- `online-manager.js` - Multijugador WebSocket + BroadcastChannel
- `server.js` - Servidor Node.js con salas
- `style.css` - UI glassmorphism profesional

## 🔧 Tecnologías
- Three.js 0.160.0
- WebSocket (ws 8.14.2)
- BroadcastChannel API
- MeshPhysicalMaterial con transmission

¡Disfruta del ajedrez cristalino más avanzado!
