Vim教程 [https://www.zhihu.com/people/jeccica-20/posts?page=2](https://www.zhihu.com/people/jeccica-20/posts?page=2)

![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20230320171941.png)


# 光标移动

光标移动到行首: `^`（非空字符）或者`0`(命令模式),`I`插入模式
光标移动到行尾: `g`+`_`(非空字符) `$`(命令模式)  `2$`表示移动到下一行行尾 ,`A`插入模式
光标移到首行:`gg`
光标移动到第n行:`ngg`
光标移到最后一行:`G`
查找: `/xxx`查找xxx，按`n`匹配下一个，`N`匹配上一个
向上滚屏: `Ctrl+f`
向下滚屏: `Ctrl+b`
向上滚动半屏:`Ctrl+u`
向下滚动半屏:`Ctrl+d`
将当前行设置在屏幕中间: `zz`
将当前行滚动到屏幕顶端: `zt`
将当前行滚动到屏蔽底端: `zb`
在当前行查找字符:`f`
以单词移动：

- 移动到下一单词的开头:`w`
- 移动到下一单词的结尾:`e`
- 移动到上一单词的开头:`b`
- 移动到上一单词的结尾:`g`+`e`

以字符串移动:和单词一样，只不过转成大写
移动到上/下一段落:`{``}`	
移动到光标所在单词的末尾:`e`
移动光标到**匹配**光标当前所在单词的**下**一个单词:`*`
移动光标到**匹配**光标当前所在单词的**上**一个单词:`#`
要返回到上次跳转的位置:`''`
改写双引号中的内容:`ci"`
选中双引号中的内容: `vi"` 
选中双引号中的内容(包括双引号): `va"` 
选中括号内: `vib` `vi(`
选中花括号内: `viB`
选中当前单词:`ve`
delete同理 `da"` 
改写当前光标下两个单词:`c2w`
改写到小括号前:`ct(`
移动到当前单词的下一个/上一个: `*` / `#` 
标记当前位置: `m{a-zA-Z}` 
跳转到标记的所在行的第一个非空白字符: `'{a-zA-Z}`
跳转到标记所在行，标记所在的列: ``{a-zA-Z}` 
返回上一光标位置: `ctrl+o`
返回下一光标位置: `ctrl+i`
悬浮显示（一般用于查看报错的代码提示信息）:`g`+`h`

# 编辑

复制当前行: `yy`
复制光标所在的向下n行: `nyy`
复制选中内容: `y`
粘贴: `p`在下一行粘贴，`P`在上一行粘贴	
插入一行并进入插入模式:`o`
删除选中内容:`d`
删除光标字符并进入插入模式:`s`
删除光标所在行并进入插入模式:`S`
删除光标所在字符:`x`
删除光标前的字符:`X`
删除当前行: `dd`
删除光标到行尾/首: `d$`/`d0`
清空当前行:`0D`
向下删除n行:`ndd`
向上删除n行: `ndk`
删除xx行至xx行: `:1,10d`
全选（高亮显示**）：按`esc`后，然后`ggvG`或者`ggVG`
全部复制：按`esc后`，然后`ggyG`
全部删除：按`esc`后，然后`dG`
删除当前行并进入插入模式:`cc`
撤销： `u` 
恢复撤销： `ctrl+r` 
重复操作: `.` 
删除当前光标所在单词并进入插入模式:`ciw` `caw` 
删除当前光标所在单词: `daw` `daw` `cw`
替换光标所在字符的大小写: `~`
把当前单词全部变成大写：`gUiw`
将选中文本大小写 : `gU` `gu`
将当前字符替换为指定字符: `r+字符`
从当前光标起，将后续文本替换为新输入的部分，按 Esc 终止替换:`R+输入`
注释行: `gcc`
注释两行: `gc2j`
注释块: `gCC`
注释代码块: `gCi)` `gCi}`
剪切()之间的内容:`di(`
复制()之间: `yi(`
修改()之间的内容: `ci`
删除标签之间的内容: `dit`
当前单词添加引号: `viw`+`S"`
删除函数体: `daB` `da{`
查看寄存器 `:reg`
查看剪切板寄存器 `:reg +`
使用寄存器 `"0p` `"ap`
复制到系统剪切板 `"+y`
从系统剪切板粘贴到编辑器: `"+p`
当前位置到单词末尾添加符号 `ysw)` `yse)`
删除两边符号  `ds]` `ds{`
数字自增/自减: `ctrl`+`a`/`ctrl`+`x`

## vim-surround

单词两边添加符号 `ysiw"`
使用标签包裹单词 `ysiwt`
删除字符两端的符号 `d`+`s`+`符号`
删除字符两边标签:`dst`
替换两边符号 `cs"'`
替换两边标签 `cstt`
给选中字符两边添加符号: `S`+`符号`
删除当前单词:`cw``ciw`
在当前单词结尾插入: `ea`






#  标记

对单文件进行标记: `m`+小写字母 e.g `m`+`m`
对多文件进行标记: `m`+大写字母 e.g `m`+`M`




# 操作

进入可视模式:`v`/`V`
分割窗口: `:sp``:vsp`
折叠: `zc`
展开: `zo`
对所在范围内所有嵌套的折叠点进行折叠: `zC`
对所在范围内所有嵌套的折叠点展开: `zO`

