import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import StillPage from '../pages/StillPage.vue' // 1. Import StillPage

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/still', // 2. Map the path (matches your NavBar.vue link)
      name: 'still',
      component: StillPage,
    },
  ],
})

export default router
