document.addEventListener('DOMContentLoaded', () => {
    const tokenInput = document.getElementById('token-input');
    const saveBtn = document.getElementById('save-token-btn');
    const status = document.getElementById('token-status');

    // 初始化时回显 token
    const savedToken = localStorage.getItem('userToken');
    if (savedToken && tokenInput) {
        tokenInput.value = savedToken;
        status.textContent = 'Token 已保存';
    }

    if (saveBtn && tokenInput) {
        saveBtn.addEventListener('click', () => {
            const token = tokenInput.value.trim();
            if (token) {
                localStorage.setItem('userToken', token);
                status.textContent = 'Token 已保存';
            } else {
                status.textContent = '请输入有效的 Token';
            }
        });
    }

    // 队列和任务获取逻辑
    const queueIdInput = document.getElementById('queue-id-input');
    const fetchQueueBtn = document.getElementById('fetch-queue-btn');
    const queueInfoDiv = document.getElementById('queue-info');
    const taskListDiv = document.getElementById('task-list');

    // mdui 对话框相关元素
    const errorModal = document.getElementById('error-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const closeModal = document.getElementById('close-modal');
    let mduiDialog = null;

    // 显示错误 mdui 弹窗
    function showError(title, message) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        if (!mduiDialog) {
            mduiDialog = new mdui.Dialog(errorModal);
        }
        mduiDialog.open();
    }

    // 关闭 mdui 弹窗
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (mduiDialog) mduiDialog.close();
        });
    }

    if (fetchQueueBtn && queueIdInput) {
        fetchQueueBtn.addEventListener('click', async () => {
            const queueId = queueIdInput.value.trim();
            const token = localStorage.getItem('userToken');
            queueInfoDiv.textContent = '';
            taskListDiv.textContent = '';

            if (!queueId) {
                showError('输入错误', '请输入有效的 Queue ID');
                return;
            }
            if (!token) {
                showError('Token 错误', '请先输入并保存 Token');
                return;
            }

            try {
                // 获取 queue 信息
                const queueRes = await fetch(`/api/queue/${queueId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (queueRes.status === 401 || queueRes.status === 403) {
                    showError('认证失败', '请检查 Token 是否正确，或重新输入 Token');
                    return;
                }

                if (queueRes.status === 404) {
                    showError('队列不存在', `ID 为 ${queueId} 的队列不存在`);
                    return;
                }

                if (!queueRes.ok) {
                    showError('请求失败', '获取队列信息失败');
                    return;
                }

                const queueData = await queueRes.json();
                queueInfoDiv.textContent = `队列信息: ${JSON.stringify(queueData.queue, null, 2)}`;

                // 获取 task 列表
                const taskRes = await fetch(`/api/queue/${queueId}/tasks`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!taskRes.ok) {
                    showError('请求失败', '获取任务列表失败');
                    return;
                }

                const taskData = await taskRes.json();
                if (Array.isArray(taskData.tasks)) {
                    taskListDiv.innerHTML =
                        '<b>任务列表:</b><ul>' +
                        taskData.tasks.map((task) => `<li>${task.name} (状态: ${task.status ?? '未知'})</li>`).join('') +
                        '</ul>';
                } else {
                    taskListDiv.textContent = '无任务';
                }
            } catch {
                showError('网络错误', '请求出错，请检查网络连接');
            }
        });
    }

    // 页面切换逻辑
    const navToken = document.getElementById('nav-token');
    const navQueue = document.getElementById('nav-queue');
    const pageToken = document.getElementById('page-token');
    const pageQueue = document.getElementById('page-queue');

    function showPage(page) {
        if (page === 'token') {
            pageToken.style.display = '';
            pageQueue.style.display = 'none';
        } else {
            pageToken.style.display = 'none';
            pageQueue.style.display = '';
        }
    }

    if (navToken) {
        navToken.addEventListener('click', () => showPage('token'));
    }
    if (navQueue) {
        navQueue.addEventListener('click', () => showPage('queue'));
    }

    // 默认显示 token 页面
    showPage('token');
});
