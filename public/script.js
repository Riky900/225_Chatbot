
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const messagesContainer = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const sendBtn = document.getElementById("sendBtn");
const toast = document.getElementById("toast");
const sidebar = document.getElementById("sidebar");

let messages = [];
let isSending = false;

// Menampilkan notifikasi
function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// Scroll ke pesan terbaru
function scrollToBottom() {
    const area = document.getElementById("chatArea");

    area.scrollTop = area.scrollHeight;
}

// Membuat tampilan pesan
function addMessage(role, text = "") {

    welcome.style.display = "none";

    const row = document.createElement("div");
    row.className = `message ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "user" ? "K" : "✦";

    const content = document.createElement("div");
    content.className = "message-content";

    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = role === "user" ? "Kamu" : "Nova AI";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;

    content.append(name, bubble);
    row.append(avatar, content);

    messagesContainer.appendChild(row);

    scrollToBottom();

    return bubble;
}

// Loading button
function setLoading(value) {

    isSending = value;
    sendBtn.disabled = value;

    sendBtn.querySelector("span").textContent =
        value ? "Menjawab" : "Kirim";
}

// Mengirim pesan ke AI
async function sendMessage(value) {

    const prompt = value.trim();

    if (!prompt || isSending) return;

    addMessage("user", prompt);

    messages.push({
        role: "user",
        content: prompt
    });

    messageInput.value = "";
    messageInput.style.height = "auto";

    setLoading(true);

    const answer = addMessage("assistant");

    answer.innerHTML =
        '<span class="typing"><i></i><i></i><i></i></span>';

    try {

        const response = await fetch("/api/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages
            })
        });

        if (!response.ok) {

            let detail = "Gagal menghubungi server.";

            try {
                const result = await response.json();
                detail = result.error || detail;
            } catch (_) {}

            throw new Error(detail);
        }

        if (!response.body) {
            throw new Error("Streaming tidak didukung browser ini.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        let fullAnswer = "";

        answer.textContent = "";

        // Membaca data streaming
        while (true) {

            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, {
                stream: true
            });

            const events = buffer.split("\n\n");
            buffer = events.pop();

            for (const event of events) {

                const line = event
                    .split("\n")
                    .find(item => item.startsWith("data:"));

                if (!line) continue;

                const data = line.slice(5).trim();

                if (!data || data === "[DONE]") continue;

                try {

                    const parsed = JSON.parse(data);

                    if (parsed.content) {

                        fullAnswer += parsed.content;

                        answer.textContent = fullAnswer;

                        scrollToBottom();
                    }

                } catch (error) {

                    console.error(
                        "Gagal membaca data streaming:",
                        error
                    );
                }
            }
        }

        // Menangani data terakhir
        if (buffer.trim()) {

            const line = buffer.trim()
                .split("\n")
                .find(item => item.startsWith("data:"));

            if (line) {

                try {

                    const parsed = JSON.parse(
                        line.slice(5).trim()
                    );

                    if (parsed.content) {
                        fullAnswer += parsed.content;
                    }

                } catch (_) {}
            }
        }

        answer.textContent = fullAnswer ||
            "Belum ada jawaban yang diterima. Coba kirim ulang.";

        if (fullAnswer) {

            messages.push({
                role: "assistant",
                content: fullAnswer
            });
        }

    } catch (error) {

        console.error("Chat Error:", error);

        answer.textContent =
            `Terjadi kesalahan: ${error.message}`;

        showToast(
            "Pesan gagal dikirim. Periksa server dan API Key."
        );

    } finally {

        setLoading(false);

        messageInput.focus();

        scrollToBottom();
    }
}

// Submit pesan
chatForm.addEventListener("submit", event => {

    event.preventDefault();

    sendMessage(messageInput.value);
});

// Mengatur tinggi textarea
messageInput.addEventListener("input", () => {

    messageInput.style.height = "auto";

    messageInput.style.height =
        `${Math.min(messageInput.scrollHeight, 150)}px`;
});

// Enter untuk mengirim pesan
messageInput.addEventListener("keydown", event => {

    if (event.key === "Enter" && !event.shiftKey) {

        event.preventDefault();

        chatForm.requestSubmit();
    }
});

// Tombol pertanyaan rekomendasi
document.querySelectorAll(".suggestion").forEach(button => {

    button.addEventListener("click", () => {

        sendMessage(button.dataset.prompt || "");
    });
});

// Reset percakapan
function resetChat() {

    if (isSending) {
        return showToast("Tunggu sampai jawaban selesai.");
    }

    messages = [];

    messagesContainer.innerHTML = "";

    welcome.style.display = "";

    messageInput.value = "";

    messageInput.focus();

    showToast("Percakapan baru dimulai.");
}

// Tombol percakapan baru
document.getElementById("newChatBtn")
    .addEventListener("click", () => {

        resetChat();

        sidebar.classList.remove("open");
    });

// Tombol hapus chat
document.getElementById("clearBtn")
    .addEventListener("click", resetChat);

// Menu mobile
document.getElementById("mobileMenu")
    .addEventListener("click", () => {

        sidebar.classList.toggle("open");
    });
