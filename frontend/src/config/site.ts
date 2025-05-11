export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "视频转换队列系统",
  description: "高效管理视频转换任务队列的系统",
  navItems: [
    {
      label: "仪表盘",
      href: "/",
    },
    {
      label: "任务",
      href: "/tasks",
    },
    {
      label: "机器",
      href: "/machines",
    },
    {
      label: "设置",
      href: "/settings",
    }
  ],
  navMenuItems: [
    {
      label: "仪表盘",
      href: "/",
    },
    {
      label: "任务",
      href: "/tasks",
    },
    {
      label: "机器",
      href: "/machines",
    },
    {
      label: "设置",
      href: "/settings",
    },
    {
      label: "帮助 & 反馈",
      href: "/help",
    },
    {
      label: "退出",
      href: "/logout",
    }
  ],
  links: {
    github: "https://github.com/heroui/heroui",
    twitter: "https://twitter.com/heroui",
    docs: "https://heroui.dev",
    discord: "https://discord.gg/heroui",
    sponsor: "https://heroui.dev/sponsor"
  }
};
