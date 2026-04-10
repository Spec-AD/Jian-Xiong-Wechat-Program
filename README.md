开发须知：



**1.需下载的软件**

为了确保开发的统一性和代码风格的易维护性，我们建议使用以下工具开发：
A. 微信开发者工具 [点此下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)；

B. Visual Studio Code (Microsoft) [点此下载](https://code.visualstudio.com/)；

C. Git [点此下载](https://git-scm.com/)。（在安装时一直点击 Next 即可）



1-1 环境配置

打开 VS Code.

按住 \[Ctrl] + \[\~] 打开内置终端，并依次输入：

git config --global user.name "你的名字“

git config --global user.email "你的邮箱”



完成后，进行仓库的远程拉取。

仓库地址：https://github.com/Spec-AD/Jian-Xiong-Wechat-Program.git

打开 VS Code.

点击左侧侧边栏的 源代码管理 图标，点击 克隆仓库，在顶部弹出的输入框中输入上述仓库地址。选择文件夹建议不含中文路径和非桌面路径。

你理应可以在 VS Code 界面中看到项目的整个结构。



1-2 运行小程序

在开发过程中，需要实时预览小程序的功能。



打开 微信开发者工具。

点击 导入，选择你刚才克隆下来的文件夹，在 AppID 设置中填入真实 AppID。



1-3 开发代码

每次在 VS Code 开发代码前，务必先拉取最新的仓库。

写完代码后，在左侧“源代码管理”中点击 + 号暂存更改，然后在弹出的文件首行按以下格式书写更新内容：

**feat:\[更新内容]**

点击提交后，如果需要推送到 Git 仓库，再点击一次“同步更改”。

**\[代码冲突]：遇到代码冲突问题，停止提交，不要强行覆盖，将问题截图发在群中。**



2\.如何开发

你可使用 VS Code 组件 Continue 进行 AI 协作开发。

具体的模型 API 接口接入，自行上网学习。

