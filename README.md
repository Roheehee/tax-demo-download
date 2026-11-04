# 个税演示下载页

此仓库只包含已脱敏的比赛演示网页、公开图标和桌面安装文件，不含原个人资料、用户备份或签名凭证。

- iPhone 下载 `downloads/tax-demo.mobileconfig`，在设置中安装后添加网页桌面入口；此文件只含 Web Clip，不是 IPA，没有 MDM、VPN、证书或账号载荷。
- Android 使用 `app/install.html` 的网页应用安装流程，当前没有 APK；页面明确区分。
- `app/` 为公开脱敏应用副本，数据保存在使用者当前浏览器/桌面入口，换地址需自行导出导入备份。
- GitHub Pages 从 main 根目录发布；应用 SW 仅作用于 `app/`，不缓存下载描述文件。
- 配置文件与真实 iPhone 安装行为须在用户设备上核对；未签名配置文件与 Apple App 签名是不同事物。

不得把原始私有项目中的个人资料、纳税文书原图或手机备份复制到本仓库。

下载页和应用由 GitHub Pages 托管；苹果按钮的描述文件由现有公开匿名 Sites Worker 返回正确的 `application/x-apple-aspen-config` 类型。仓库中的同名文件为可核对的源副本；GitHub Pages 默认类型不能作为 Safari 安装识别已通过的依据。修改安装文件时必须同步两端，并核对字节一致。
