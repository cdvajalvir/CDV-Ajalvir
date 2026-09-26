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

    // Extraemos la URL que mandas desde Supabase, o usamos la raíz por defecto
    const targetUrl = (event.notification.data && event.notification.data.url) 
        ? event.notification.data.url 
        : '/CDV-Ajalvir/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // Si ya hay una pestaña abierta de la web, la enfocamos y la navegamos
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url.includes('CDV-Ajalvir') && 'focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(targetUrl);
                    }
                }
            }
            // Si no hay ninguna pestaña abierta, abrimos una nueva ventana
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
