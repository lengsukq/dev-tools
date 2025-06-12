<script setup>
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <div id="app">
    <nav>
      <router-link to="/">首页</router-link> | 
      <router-link to="/new-page">新页面</router-link>
    </nav>
    <router-view/>
  </div>
</template>

<style scoped>
/* 保留现有样式 */
nav {
  padding: 30px;
  text-align: center;
}

nav a {
  margin: 0 10px;
  text-decoration: none;
  color: #333;
}

nav a.router-link-exact-active {
  color: #42b983;
  font-weight: bold;
}
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
