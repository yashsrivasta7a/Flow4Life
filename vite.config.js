import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the service worker
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Flow4Life',
        short_name: 'F4L',
        description: 'Find Blood Donors',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'donordash192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'donordash.png',
            sizes: '1024x1024',
            type: 'image/png'
          }
        ]
        ,screenshots: [
          {
            src: '/screenshots/home.png',
            sizes: '1080x1920',
            type: 'image/png',
            label: 'Home screen',
          }
        ]
      }
    })
  ],
   server: {
    host: '0.0.0.0', // Expose to the network
    allowedHosts: ['https://28a7-2401-4900-1c88-26aa-25eb-24a9-53-a16a.ngrok-free.app']
  },
  preview: {
    allowedHosts: ['https://28a7-2401-4900-1c88-26aa-25eb-24a9-53-a16a.ngrok-free.app']
  }
});