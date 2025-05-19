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
        
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Expose to the network   
  },
});