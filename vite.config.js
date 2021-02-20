import vue from '@vitejs/plugin-vue';
import path from 'path';

export default ({ command, mode }) => ({
  plugins: [vue()],

  build: {
    target: 'esnext',
    outDir: path.join(__dirname, 'build/dist'),
    emptyOutDir: true
  },

  define: {
    DEV_MODE: JSON.stringify(mode === 'development'),
    API_HOST: JSON.stringify('vk-desktop.herokuapp.com'),
    __VUE_OPTIONS_API__: false,
    __VUE_PROD_DEVTOOLS__: false
  },

  resolve: {
    mainFields: ['module'],
    extensions: ['.js'],

    alias: {
      'js': path.join(__dirname, 'src/js'),
      'css': path.join(__dirname, 'src/css'),
      'lang': path.join(__dirname, 'src/lang')
    }
  },

  server: {
    port: 9973
  }
});
