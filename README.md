# Creative Engine Asset Store

Tienda de assets para el motor de videojuegos "Creative Engine". Este proyecto es una plataforma web que permite a los usuarios comprar y vender assets para el motor.

## ✨ Características Principales

*   **Autenticación de Usuarios:** Sistema completo de registro e inicio de sesión para usuarios y administradores.
*   **Gestión de Productos:** Los usuarios pueden subir sus assets, incluyendo un archivo principal y hasta tres imágenes de vista previa.
*   **Panel de Vendedor:** Un dashboard donde los vendedores pueden ver sus productos subidos y un resumen de sus ganancias.
*   **Panel de Administración:** Un panel seguro y basado en roles para que los administradores revisen, aprueben o rechacen los productos pendientes.
*   **Sistema de Puntos:** Los usuarios pueden obtener assets gratuitos (precio cero) usando un sistema de puntos.
*   **Lista de Deseos (Wishlist):** Funcionalidad para que los usuarios guarden los productos que les interesan.
*   **Integración con PayPal:** Sistema de pago seguro para comprar assets utilizando la API de PayPal.
*   **Navegación por Categorías:** Los productos están organizados y se pueden filtrar por categorías.

## 💻 Tecnologías Utilizadas

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **Backend y Base de Datos:** [Supabase](https://supabase.io/)
    *   **Supabase Auth:** Para la gestión de usuarios.
    *   **Supabase Database:** Base de datos PostgreSQL para almacenar la información de productos, perfiles, etc.
    *   **Supabase Storage:** Para el almacenamiento de los archivos de los assets y las imágenes.
    *   **Supabase Edge Functions:** Funciones serverless (Deno) para gestionar la lógica de negocio segura, como la creación y captura de órdenes de PayPal.
*   **API de Pagos:** [PayPal REST API](https://developer.paypal.com/home/)

## 🚀 Configuración e Instalación

Para ejecutar este proyecto localmente, sigue estos pasos:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/tu-repositorio.git
    cd tu-repositorio
    ```

2.  **Configurar Supabase:**
    *   Crea un nuevo proyecto en [Supabase](https://supabase.io/).
    *   Ve a la sección de **Settings -> API** y copia tu **Project URL** y tu **anon public key**.
    *   Ve al **SQL Editor** y ejecuta el script necesario para crear las tablas (`profiles`, `products`, etc.). Asegúrate de que la tabla `profiles` tenga una columna booleana `is_admin`.
    *   Configura las **Edge Functions** (`paypal-create-order`, `paypal-capture-order`) en tu proyecto de Supabase.

3.  **Configurar PayPal:**
    *   Crea una cuenta de desarrollador en [PayPal Developer](https://developer.paypal.com/).
    *   Crea una nueva aplicación en la sección **My Apps & Credentials** para obtener tu **Client ID** de Sandbox.

## ⚙️ Variables de Entorno y Configuración

Para que la aplicación funcione, necesitas configurar las siguientes variables en los archivos correspondientes:

1.  **Configuración de Supabase en `js/main.js`:**
    *   Dentro del archivo `js/main.js`, reemplaza los placeholders con tu URL y clave de Supabase:
        ```javascript
        const supabaseUrl = 'YOUR_SUPABASE_URL';
        const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
        ```

2.  **Configuración de PayPal en `product.html`:**
    *   Dentro del archivo `product.html`, busca la línea del script de PayPal y reemplaza `YOUR_SANDBOX_CLIENT_ID` con tu Client ID de PayPal Sandbox:
        ```html
        <script src="https://www.paypal.com/sdk/js?client-id=YOUR_SANDBOX_CLIENT_ID&currency=USD"></script>
        ```

## ▶️ Uso del Sitio

*   **Registro y Login:** Cualquier usuario puede registrarse.
*   **Subir un Asset:** Una vez iniciada la sesión, ve a `upload.html` para subir tus assets.
*   **Comprar un Asset:** Navega por los productos, selecciona uno y haz clic en "Comprar" para pagar con PayPal o "Obtener Gratis" si el precio es cero.
*   **Acceso de Administrador:**
    *   Para dar acceso de administrador a un usuario, debes establecer manualmente el campo `is_admin` a `true` para ese usuario en la tabla `profiles` de Supabase.
    *   Una vez que el usuario es administrador, el enlace "Panel de Admin" aparecerá en el menú de configuración después de iniciar sesión.
