// sw.js - Service Worker para notificaciones push

// Escucha cuando llega una notificación push desde el servidor
self.addEventListener('push', function(event) {
    if (!event.data) return;

    const data = event.data.json();
    
    const title = data.title || 'CD Veteranos Ajalvir';
    const options = {
        body: data.body || 'Tienes una nueva notificación.',
        icon: '/assets/img/escudo-cdv-ajalvir.jpg', // Ajusta la ruta a tu escudo si lo necesitas
        badge: '/assets/img/escudo-cdv-ajalvir.jpg'
        data: {
            url: data.url 
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Maneja el clic en la notificación
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    // 2. Recuperamos la URL que guardamos en la notificación (o usamos '/' como respaldo)
    const urlToOpen = (event.notification.data && event.notification.data.url) 
        ? event.notification.data.url 
        : '/';
    console.log("Abriendo URL desde la push:", urlToOpen);
    event.waitUntil(
        clients.openWindow(urlToOpen)
    );
});
