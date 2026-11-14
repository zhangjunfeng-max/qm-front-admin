<template>
  <footer class="icp-footer text-muted-foreground">
    <a
      href="https://beian.miit.gov.cn/"
      rel="noopener noreferrer"
      target="_blank"
    >
      蜀ICP备2026070853号-1
    </a>
  </footer>
</template>

<style scoped>
.icp-footer {
  padding: 6px 12px;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}

.icp-footer a {
  color: inherit;
  white-space: nowrap;
}

.icp-footer a:hover,
.icp-footer a:focus-visible {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
