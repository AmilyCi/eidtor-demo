/**
 * AI Stream Generator Plugin - OnlyOffice 插件
 * 用于流式插入 AI 生成的文本到文档
 */

(function() {
    // 插件启动时执行
    window.Asc.plugin.init = function() {
        console.log('AI Stream Generator 插件已初始化');
    };

    // 插件加载完成
    window.Asc.plugin.onLoad = function() {
        console.log('AI Stream Generator 插件已加载');
        // 调整插件窗口大小
        if (window.Asc.plugin.resizeWindow) {
            window.Asc.plugin.resizeWindow(400, 500);
        }
    };

    // 插件按钮点击时执行 - 打开插件 UI 面板
    window.Asc.plugin.executePlugin = function() {
        console.log('AI 写作插件被点击');
        // 插件 UI 会自动打开（因为配置了 isVisual: true）
    };

    // 选择变化时触发
    window.Asc.plugin.event_onSelectionChanged = function() {
        // 可以在这里处理选择变化
    };

    // 插件窗口关闭时
    window.Asc.plugin.onClose = function() {
        console.log('AI Stream Generator 插件已关闭');
    };

})();
