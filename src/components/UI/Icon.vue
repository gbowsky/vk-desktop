<script>
import { h } from 'vue';

export default function Icon({ name, ...iconProps }) {
  const icon = require(`!vue-svg-loader!assets/${name}.svg`).default;
  return h(icon, iconProps);
}
</script>
