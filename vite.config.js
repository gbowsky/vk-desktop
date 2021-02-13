import vue from '@vitejs/plugin-vue';
import path from 'path';

export default {
  plugins: [vue()]
  // TODO alias
  // alias: {
  //   'js': path.resolve(__dirname, 'src/js'),
  //   'css': path.resolve(__dirname, 'src/css'),
  //   'lang': path.resolve(__dirname, 'src/lang')
  // }
};
