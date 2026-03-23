import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Editor from './views/Editor.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/editor/:filename',
    name: 'Editor',
    component: Editor
  },
  // 通配符路由 - 避免 Vue Router 拦截 OnlyOffice 的 iframe 请求
  {
    path: '/:pathMatch(.*)*',
    name: 'catch-all',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
