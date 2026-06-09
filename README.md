<div align="center">
  <img src="https://img.icons8.com/color/256/bento.png" alt="Viandas Logo" width="120" />
  <h1>🍔 Viandas API 🚀</h1>
  <p><em>El backend definitivo para la gestión y selección de viandas.</em></p>

  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](#)
  [![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)](#)
  [![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](#)
  [![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)](#)
  [![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)](#)
</div>

---

## 🍱 Sobre el Proyecto

**Viandas API** es un backend RESTful mega insano construido con **Node.js** y **Express**, enrutado para revolucionar la forma en que los usuarios eligen, organizan y gestionan sus viandas de comida diarias. 

### ✨ Características Épicas

- 🔐 **Autenticación Segura:** Sistema de login y registro protegido con JSON Web Tokens (JWT) y contraseñas hasheadas con bcryptjs.
- 🍗 **Gestión de Menús:** ABM completo (Alta, Baja, Modificación) de platos y guarniciones.
- 📅 **Selección Inteligente:** Los usuarios pueden armar y reservar sus viandas para la semana.
- 🗄️ **Base de Datos Ligera y Rápida:** SQLite configurado con `async/await` para máxima performance.
- 🧪 **Testeable:** Ya viene modeado y configurado con Jest y Supertest para hacer TDD.
- 🏗️ **Arquitectura Limpia:** Separación rígida entre Capa de Rutas, Servicios y Repositorios.

---

## 🛠️ Tecnologías Utilizadas

| Tecnología | Rol en la app |
| ---------- | ----------- |
| **Node.js + Express.js** | Motor de la API y enrutamiento minimalista. |
| **SQLite3 + sqlite** | Motor de base de datos relacional, todo en un solo archivo `.sqlite`. |
| **JWT & Bcryptjs** | Generación de tokens de sesión y seguridad (encriptación). |
| **Jest & Supertest** | Frameworks para hacer pruebas epicas. |
| **Nodemon** | Hot-reload en modo development. |

---

## 📂 Estructura del Proyecto

```text
📦 Viandas-Back
┣ 📂 src
┃ ┣ 📂 config         # Variables de entorno y configs (.env)
┃ ┣ 📂 database       # Instancia de SQLite e inicialización (initDb)
┃ ┣ 📂 middlewares    # Validaciones, control de acceso y manejo de errores (AppErrors)
┃ ┣ 📂 repositories   # Capa de acceso a datos (queries SQL directas)
┃ ┣ 📂 routes         # Endpoints de Express (Controladores)
┃ ┣ 📂 services       # Lógica de negocio mega insana
┃ ┣ 📂 utils          # Utilidades globales de la app
┃ ┣ 📜 app.js         # Instancia de Express y middlewares globales
┃ ┗ 📜 server.js      # Punto de entrada / Listener del puerto HTTP
┣ 📜 .env             # Tu entorno (Shh, es secreto)
┣ 📜 .gitignore       # Archivos ignorados por Git
┣ 📜 package.json     # Metadatos y dependencias
┗ 📜 README.md        # Esta belleza
```

---

## 🚀 Cómo Empezar (Modo Desarrollador)

### 1️⃣ Instalar Dependencias
Abrí la terminal en la raíz del proyecto y corré:
```bash
npm install
```

### 2️⃣ Configurar Entorno
Asegurate de que tu archivo `.env` esté listo con lo básico:
```env
PORT=3000
JWT_SECRET=secreto_mega_insano_123
DB_FILE=./data/database.sqlite
```

### 3️⃣ Inicializar la Base de Datos
Tirale este comando para que se generen las tablas (Asegurate que la carpeta data exista o ajustá la ruta):
```bash
node src/database/initDb.js
```

### 4️⃣ Encender la Nave 🛸
Prendé el proyecto con Nodemon para que escuche cada cambio:
```bash
npm run dev
```
> 🔥 _Boom. Entrá a http://localhost:3000 y sentí el poder._

---

<div align="center">
  <i>Desarrollado con ❤️ (y mucha picardía) para dominar el mundo de las viandas.</i>
</div>