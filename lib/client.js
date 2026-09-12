window.__ModuleLoader__.load({
  id: "dsh-composer-keys",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    var react = require("react");

    // ## 输入元素识别
    // 0.1.1：槽位里的 <textarea> / <input>。
    // 0.1.5：Lexical 的 <div contenteditable data-composer-input>（ComposerContentEditable）。
    // 只用官方 data-* 标识，不依赖任何 hash class。
    var COMPOSER_INPUT_SELECTOR = "[data-composer-input]";

    // 官方 hook 由 renderer 的 bindSnapshotSelector 生成，其 selector 形参没有默认值
    // （dsh-client-ui-renderer/lib/client.js:158-160，内联 shim :107/:116 直接调用 selector）。
    // 因此 useChat() / useInput() 无参调用会抛 TypeError —— 必须显式传一个 selector。
    function identitySelector(value) {
      return value;
    }

    function composerInputOf(node) {
      if (!node || typeof node.closest !== "function") return null;
      var editable = node.closest(COMPOSER_INPUT_SELECTOR);
      if (editable) return editable;
      var tag = node.tagName;
      return tag === "TEXTAREA" || tag === "INPUT" ? node : null;
    }

    // 富文本输入（Lexical）与表单输入（textarea/input）走两套完全不同的 API。
    // 文本域专有 API 在 contenteditable 上读到的是 undefined：不报错，只静默失效。
    function isRichInput(el) {
      return typeof el.matches === "function" && el.matches(COMPOSER_INPUT_SELECTOR);
    }

    function readDraftFromDom(el) {
      if (!isRichInput(el)) return el.value || "";
      var blocks = el.children;
      if (!blocks || blocks.length === 0) return el.textContent || "";
      var parts = [];
      for (var i = 0; i < blocks.length; i++) parts.push(blocks[i].textContent || "");
      return parts.join("\n");
    }

    function hasSelection(el) {
      if (!isRichInput(el)) return el.selectionStart !== el.selectionEnd;
      var sel = window.getSelection();
      if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) return false;
      return el.contains(sel.getRangeAt(0).startContainer);
    }

    // 光标是否停在文档最前（top）/ 最后（bottom），且没有选区。
    // 这是「级联」判定的唯一依据：只有按键前光标已在端点时才接管方向键，
    // 中途一律放行，让平台按普通编辑器的方式自己移动光标。
    function caretAtEdge(el, edge) {
      if (!isRichInput(el)) {
        if (el.selectionStart !== el.selectionEnd) return false;
        if (edge === "top") return el.selectionStart === 0;
        return el.selectionEnd === (el.value || "").length;
      }
      var sel = window.getSelection();
      if (sel === null || sel.rangeCount === 0 || !sel.isCollapsed) return false;
      var range = sel.getRangeAt(0);
      if (!el.contains(range.startContainer)) return false;
      var probe = range.cloneRange();
      probe.selectNodeContents(el);
      if (edge === "top") probe.setEnd(range.startContainer, range.startOffset);
      else probe.setStart(range.endContainer, range.endOffset);
      return (probe.toString() || "").length === 0;
    }

    // ## 历史消息来源
    // ContentBlock（dsh-llm）：只有 text / reasoning 带 text，其余是附件或工具块。
    function textOfContentBlocks(content) {
      if (typeof content === "string") return content;
      if (!content) return "";
      if (!Array.isArray(content)) {
        return typeof content.text === "string" ? content.text : "";
      }
      var parts = [];
      for (var i = 0; i < content.length; i++) {
        var block = content[i];
        if (!block || typeof block !== "object") continue;
        if (typeof block.text === "string") parts.push(block.text);
      }
      return parts.join("");
    }

    // 0.1.5：官方 chat hook 的 ChatSnapshot → legacy.nodes → UserMessageNode。
    // 不能用 projections.faceOf(key)：全仓没有任何一处注册 chat / messages 这个 key。
    function historyFromChatSnapshot(snapshot) {
      var out = [];
      var legacy = snapshot ? snapshot.legacy : null;
      var nodes = legacy ? legacy.nodes : null;
      if (!Array.isArray(nodes)) return out;
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (!node || typeof node !== "object") continue;
        // steering：轮次进行中从 next-step 收件箱获准入队的人工消息，同属用户输入。
        if (node.kind !== "user" && node.kind !== "steering") continue;
        var text = textOfContentBlocks(node.content);
        if (text) out.push(text);
      }
      return out;
    }

    // 0.1.1：槽位 session props 的形状不稳定，保留原有的宽松扫描作为回退。
    function historyFromSession(session) {
      var userMessages = [];
      if (!session) return userMessages;
      var sessionKeys = Object.keys(session);
      for (var ki = 0; ki < sessionKeys.length; ki++) {
        var arr = session[sessionKeys[ki]];
        if (!Array.isArray(arr)) continue;
        for (var i = 0; i < arr.length; i++) {
          var item = arr[i];
          if (!item || typeof item !== "object") continue;
          var isUser =
            item.role === "user" ||
            item.kind === "user" ||
            (item.type === "message" && item.role === "user");
          if (!isUser) continue;

          var content = item.content ?? item.text ?? item.message ?? item.body ?? "";
          var text = textOfContentBlocks(content);
          if (!text && content && typeof content === "object" && !Array.isArray(content)) {
            if (typeof content.value === "string") text = content.value;
          }
          if (text) userMessages.push(text);
        }
        if (userMessages.length > 0) break;
      }
      return userMessages;
    }

    var KeyboardShortcuts = function (props) {
      // hooks 由 0.1.5 的 scope binding 全局提供（官方 ui-chat 已声明 hooks:["chat"]，
      // ui-conversation 已声明 hooks:["input"] 与 props:["inputActions"]），
      // 本插件不得再用 ctx.uiSession.provide 重复声明同名项——binding 是全局合并且
      // 名称唯一，重复声明会撞 claimStandardProp 去重并抛错。
      var useChat = props.useChat;
      var chatSnapshot = typeof useChat === "function" ? useChat(identitySelector) : null;
      var useInput = props.useInput;
      var inputSnapshot = typeof useInput === "function" ? useInput(identitySelector) : null;

      var userMessages = chatSnapshot ? historyFromChatSnapshot(chatSnapshot) : [];
      if (userMessages.length === 0) userMessages = historyFromSession(props.session);

      // 监听器只在 inputActions 身份变化时重挂；历史与草稿走 ref 读取，
      // 避免 setDraft 触发的重渲染把翻页游标重置掉。
      var live = react.useRef({ messages: [], draft: null });
      live.current.messages = userMessages;
      live.current.draft =
        inputSnapshot && typeof inputSnapshot.draft === "string" ? inputSnapshot.draft : null;

      react.useEffect(function () {
        var inputActions = props.inputActions;
        if (!inputActions) return;

        var setDraft = inputActions.setDraft;
        if (typeof setDraft !== "function") return;

        var historyIndex = -1;
        var savedInput = "";

        // 两阶段监听：capture 阶段在任何其他处理器之前记录「按键前」的端点真值，
        // bubble 阶段再结合 defaultPrevented 决策。这样既拿到未被平台移动过的光标
        // 位置（保住级联语义），又能避让已经 preventDefault 的官方菜单/弹层。
        var edgeAtKeydown = null;

        function onCaptureKeyDown(e) {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          var target = composerInputOf(e.target);
          edgeAtKeydown =
            target === null
              ? null
              : { top: caretAtEdge(target, "top"), bottom: caretAtEdge(target, "bottom") };
        }

        function onKeyDown(e) {
          var el = composerInputOf(e.target);
          var edge = edgeAtKeydown;
          edgeAtKeydown = null;

          if (el === null) return;
          // IME：与官方 isComposingEvent 的前两项一致。
          if (e.isComposing || e.keyCode === 229) return;

          var draftOf = function () {
            return live.current.draft !== null ? live.current.draft : readDraftFromDom(el);
          };

          if (e.key === "ArrowUp") {
            if (live.current.messages.length === 0) return;
            // 官方菜单已消费这次按键（它自己 preventDefault）。
            if (e.defaultPrevented) return;
            var atTop = edge ? edge.top : caretAtEdge(el, "top");
            if (!atTop) return;
            e.preventDefault();
            if (historyIndex === -1) {
              savedInput = draftOf();
              historyIndex = live.current.messages.length - 1;
            } else if (historyIndex > 0) {
              historyIndex = historyIndex - 1;
            }
            setDraft(live.current.messages[historyIndex]);
          } else if (e.key === "ArrowDown") {
            if (historyIndex === -1) return;
            if (e.defaultPrevented) return;
            var atBottom = edge ? edge.bottom : caretAtEdge(el, "bottom");
            if (!atBottom) return;
            e.preventDefault();
            if (historyIndex < live.current.messages.length - 1) {
              historyIndex = historyIndex + 1;
              setDraft(live.current.messages[historyIndex]);
            } else {
              historyIndex = -1;
              setDraft(savedInput);
              savedInput = "";
            }
          } else if (e.key === "c" && e.ctrlKey) {
            if (hasSelection(el)) return;
            if (draftOf() === "") return;
            e.preventDefault();
            setDraft("");
          }
        }

        document.addEventListener("keydown", onCaptureKeyDown, true);
        document.addEventListener("keydown", onKeyDown);
        return function () {
          document.removeEventListener("keydown", onCaptureKeyDown, true);
          document.removeEventListener("keydown", onKeyDown);
        };
      }, [props.inputActions, props.session]);

      return null;
    };

    function apply(ctx) {
      var slots = ctx.get("slots");
      if (slots === undefined) return;

      slots.inject("conversation.composer.dock", function () {
        return slots.register(
          { name: "conversation.composer.dock", id: "keyboard-shortcuts", order: 50 },
          KeyboardShortcuts
        );
      });
    }

    exports.apply = apply;
    exports.name = "composer-keys";
    return module.exports;
  },
});
