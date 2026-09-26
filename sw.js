// sw.js - Service Worker para notificaciones push

// Escucha cuando llega una notificación push desde el servidor
self.addEventListener('push', function(event) {
    if (!event.data) return;

    const data = event.data.json();
    
    const title = data.title || 'CD Veteranos Ajalvir';
    const options = {
        body: data.body || 'Tienes una nueva notificación.',
        icon: '/assets/img/escudo-cdv-ajalvir.jpg', // Ajusta la ruta a tu escudo si lo necesitas
        badge: '/assets/img/escudo-cdv-ajalvir.jpg',
        data: {
            url: data.url 
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    // Si viene la URL de Supabase la usamos, si no, apuntamos a la raíz completa de GitHub Pages
    const targetUrl = (event.notification.data && event.notification.data.url) 
        ? event.notification.data.url 
        : 'https://cdvajalvir.github.io/CDV-Ajalvir/index.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                // Comprobamos que pertenezca a tu app de GitHub Pages
                if (client.url.includes('CDV-Ajalvir') && 'focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(targetUrl);
                    }
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
