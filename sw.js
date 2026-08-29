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
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Opcional: permite al usuario hacer clic en la notificación para abrir la web
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
