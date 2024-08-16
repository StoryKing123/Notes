
自带的keepalive只能保留页面滚动位置，不能保留组件的滚动位置。所以需要自定义开发
在页面离开时记录组件的滚动位置，在组件恢复的时候设置元素对应的scrollTop。

```ts

import { onActivated, Ref, ref } from "vue";

import { onBeforeRouteLeave } from "vue-router";

  

/**

 * 使用该自定义钩子在路由切换时保存和恢复滚动位置。

 *

 * @param refEle 一个 Ref 对象，指向需要保存滚动位置的元素。

 */

export const useKeepScroll = (refEle: Ref<HTMLElement | undefined>) => {

  const scroll = ref(0);

  

  // 在离开路由前保存滚动位置

  onBeforeRouteLeave(() => {

    if (refEle.value) {

      // 确保 refEle.value 不为 undefined

      scroll.value = refEle.value.scrollTop;

    }

  });

  

  // 在路由重新激活时恢复滚动位置

  onActivated(() => {

    if (refEle.value && document.contains(refEle.value)) {

      // 确认元素仍然存在于文档中

      refEle.value.scrollTop = scroll.value;

    }

  });

};

```