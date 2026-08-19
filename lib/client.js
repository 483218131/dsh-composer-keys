window.__ModuleLoader__.load({
  id: "dsh-composer-keys",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    var react = require("react");

    var KeyboardShortcuts = function (props) {
      react.useEffect(function () {
        var session = props.session;
        var inputActions = props.inputActions;

        if (!inputActions) return;

        // Extract user messages from conversation snapshot
        var userMessages = [];
        if (session) {
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
              var text = "";
              if (typeof content === "string") {
                text = content;
              } else if (Array.isArray(content)) {
                var parts = [];
                for (var j = 0; j < content.length; j++) {
                  var block = content[j];
                  if (!block || typeof block !== "object") continue;
                  if (typeof block.text === "string") {
                    parts.push(block.text);
                  } else if (block.type === "text" && typeof block.text === "string") {
                    parts.push(block.text);
                  } else if (typeof block.content === "string") {
                    parts.push(block.content);
                  }
                }
                text = parts.join("");
              } else if (content && typeof content === "object") {
                if (typeof content.text === "string") text = content.text;
                else if (typeof content.value === "string") text = content.value;
              }
              if (text) userMessages.push(text);
            }
            if (userMessages.length > 0) break;
          }
        }

        var setDraft = inputActions.setDraft;
        if (typeof setDraft !== "function") return;

        var historyIndex = -1;
        var savedInput = "";

        function onKeyDown(e) {
          var active = document.activeElement;
          if (!active) return;
          if (active.tagName !== "TEXTAREA" && active.tagName !== "INPUT") return;

          if (e.key === "ArrowUp") {
            if (userMessages.length === 0) return;
            e.preventDefault();
            if (historyIndex === -1) {
              savedInput = active.value || "";
              historyIndex = userMessages.length - 1;
            } else if (historyIndex > 0) {
              historyIndex = historyIndex - 1;
            }
            setDraft(userMessages[historyIndex]);
          } else if (e.key === "ArrowDown") {
            if (historyIndex === -1) return;
            e.preventDefault();
            if (historyIndex < userMessages.length - 1) {
              historyIndex = historyIndex + 1;
              setDraft(userMessages[historyIndex]);
            } else {
              historyIndex = -1;
              setDraft(savedInput);
              savedInput = "";
            }
          } else if (e.key === "c" && e.ctrlKey) {
            var hasSelection = active.selectionStart !== active.selectionEnd;
            if (!hasSelection && active.value !== "") {
              e.preventDefault();
              setDraft("");
            }
          }
        }

        document.addEventListener("keydown", onKeyDown);
        return function () {
          document.removeEventListener("keydown", onKeyDown);
        };
      }, [props.session, props.inputActions]);

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