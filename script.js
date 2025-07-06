document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO DA APLICAÇÃO ---
    // Guardar informações importantes aqui é uma boa prática.
    const estado = {
        usuarioLogado: null,
        desafios: [],
        desafioAtual: null,
        explicacaoAtualIndex: 0,
    };

    const apiUrl = 'http://127.0.0.1:5000';

    // --- SELEÇÃO DE ELEMENTOS DO DOM ---
    const telaLogin = document.getElementById('tela-login');
    const telaExplicacao = document.getElementById('tela-explicacao');
    const telaDesafios = document.getElementById('tela-desafios');
    const formLogin = document.getElementById('form-login');
    const dialogosContainer = document.getElementById('dialogos-container');
    const btnAnterior = document.getElementById('btn-anterior-explicacao');
    const btnProxima = document.getElementById('btn-proxima-explicacao');
    const desafiosContainer = document.getElementById('lista-desafios-container');
    const telaDesafioAtivo = document.getElementById('tela-desafio-ativo');
    const desafioTitulo = document.getElementById('desafio-titulo');
    const desafioInstrucao = document.getElementById('desafio-instrucao');
    const editorCodigo = document.getElementById('editor-codigo');
    const visualizadorResultado = document.getElementById('visualizador-resultado');
    const btnVerificar = document.getElementById('btn-verificar');
    const btnVoltar = document.getElementById('btn-voltar');
    const modalFeedback = document.getElementById('modal-feedback');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalTexto = document.getElementById('modal-texto');
    const btnModalFechar = document.getElementById('btn-modal-fechar');

    let explicacoes = []; // Começa vazio

    // Função para buscar as explicações da API
    async function buscarExplicacoes() {
        try {
            const response = await fetch(`${apiUrl}/explicacoes`);
            if (!response.ok) {
                throw new Error('Erro ao buscar explicações da API');
            }
            explicacoes = await response.json();
            renderizarExplicacoes(); // Mostra a primeira explicacao depois de carregar
        } catch (error) {
            console.error('Falha ao carregar explicações:', error);
            dialogosContainer.innerHTML = '<p>Oops! Não conseguimos carregar o conteúdo. Tente recarregar a página.</p>';
        }
    }

    // --- FUNÇÕES ---
    function mostrarTela(nomeTela) {
        // Esconde TODAS as telas principais primeiro
        telaLogin.classList.add('hidden');
        telaExplicacao.classList.add('hidden');
        telaDesafios.classList.add('hidden');
        telaDesafioAtivo.classList.add('hidden'); // Esta linha estava faltando
        
        // Mostra apenas a tela que queremos
        const telaAtiva = document.getElementById(nomeTela);
        if (telaAtiva) {
            telaAtiva.classList.remove('hidden');
        }
    }

    function renderizarExplicacoes() {
        dialogosContainer.innerHTML = ''; // Limpa o container
        // Mostra todas as explicações até o índice atual
        for (let i = 0; i <= estado.explicacaoAtualIndex; i++) {
            const explicacao = explicacoes[i];
            const dialogoItem = document.createElement('div');
            dialogoItem.className = 'dialogo-item';

            let mediaHtml = '';
            if (explicacao.codigo) {
                // Usamos .trim() para remover espaços em branco extras do início e fim do código
                mediaHtml = `<pre><code>${explicacao.codigo.trim()}</code></pre>`;
            }

            dialogoItem.innerHTML = `
                <h2>${explicacao.titulo}</h2>
                <p>${explicacao.texto.replace(/\n/g, '<br>')}</p>
                ${mediaHtml}
            `;
            dialogosContainer.appendChild(dialogoItem);
        }
        atualizarBotoes();
        // Rola a visão para o último item adicionado, para que ele fique visível
        dialogosContainer.lastChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function atualizarBotoes() {
        // Mostra ou esconde o botão "Voltar"
        btnAnterior.classList.toggle('hidden', estado.explicacaoAtualIndex <= 0);

        // Muda o texto do botão "Próximo" dependendo da etapa
        if (estado.explicacaoAtualIndex === explicacoes.length - 1) {
            btnProxima.textContent = "Ir para os Desafios!";
        } else {
            btnProxima.textContent = "Próximo";
        }
    }

   async function carregarDesafios() {

        if (!estado.usuarioLogado) {
            alert("Erro: não foi possível identificar o usuário para carregar os desafios.");
            return;
        }
        try {
            const response = await fetch(`${apiUrl}/progresso/${estado.usuarioLogado.id}`);
            
            if (!response.ok) throw new Error('A resposta da API para buscar desafios não foi OK');
            
            const desafios = await response.json();

            estado.desafios = desafios;

            desafiosContainer.innerHTML = ''; // Limpa a lista
            desafios.forEach(desafio => {
                const card = document.createElement('div');
                card.className = 'desafio-card';
                if (desafio.status === 'concluido') {
                    card.classList.add('concluido');
                }
                card.innerHTML = `
                    <h3>${desafio.nome}</h3>
                    <p>${desafio.instrucao}</p>
                    <p class="status">Status: ${desafio.status}</p>
                `;
                card.addEventListener('click', () => iniciarDesafio(desafio));
                desafiosContainer.appendChild(card);
            });
        } catch (error) {
            console.error("Erro ao carregar desafios:", error);
            alert("Não foi possível carregar a lista de desafios.");
        }
    }
    function iniciarDesafio(desafio) {
        estado.desafioAtual = desafio;
        desafioTitulo.textContent = desafio.nome;
        desafioInstrucao.textContent = desafio.instrucao;
        editorCodigo.value = desafio.codigo_bugado;
        visualizadorResultado.srcdoc = desafio.codigo_bugado;
        mostrarTela('tela-desafio-ativo');
    }

    function mostrarModalSucesso(texto) {
        modalTitulo.textContent = 'Parabéns! 🥳';
        
        let conteudoHtml = texto.replace(/\n/g, '<br>');
        conteudoHtml += `<br><br><img src="./imagens/criancadancando.gif" alt="Parabéns!">`;
        conteudoHtml += `<br><br>Você completou o desafio! Agora, vamos para o próximo?`;
        
        modalTexto.innerHTML = conteudoHtml; // Usamos innerHTML para renderizar o <pre>
        modalTitulo.className = 'sucesso';
        modalFeedback.classList.remove('hidden');
    }

    function mostrarModalErro(texto, respostaCorreta) {
        modalTitulo.textContent = 'Quase lá! 🧐';
        
        let conteudoHtml = texto.replace(/\n/g, '<br>');
        
        // Se tivermos uma resposta correta, a adicionamos
        if (respostaCorreta) {
            // Usamos a tag <pre><code> para formatar o código de forma bonita
            // E escapamos os caracteres < e > para que o navegador não os interprete como HTML
            const codigoFormatado = respostaCorreta.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            conteudoHtml += `<br><br><strong>Tente:</strong><pre><code>${codigoFormatado}</code></pre>`;
        }
        
        modalTexto.innerHTML = conteudoHtml; // Usamos innerHTML para renderizar o <pre>
        modalTitulo.className = 'erro';
        modalFeedback.classList.remove('hidden');
    }

    // --- LÓGICA DE EVENTOS ---
    formLogin.addEventListener('submit', async (event) => {
        event.preventDefault();
        const nome = document.getElementById('nome').value;
        const idade = document.getElementById('idade').value;
        try {
            const response = await fetch(`${apiUrl}/cadastrar_usuario`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, idade: parseInt(idade) })
            });
            if (!response.ok) throw new Error('Erro ao cadastrar usuário');

            const data = await response.json();
            estado.usuarioLogado = { id: data.usuario_id, nome: nome };
            
            estado.explicacaoAtualIndex = 0;
            buscarExplicacoes(); // Busca as explicações da API
            mostrarTela('tela-explicacao');

        } catch (error) {
            console.error("Falha na comunicação com a API:", error);
            alert("Erro ao se conectar com o servidor. Verifique se a API está rodando.");
        }
    });

    // Evento para o botão de verificar o código
    btnVerificar.addEventListener('click', async () => {
        if (!estado.usuarioLogado || !estado.desafioAtual) return;
        const dadosSubmissao = {
            usuario_id: estado.usuarioLogado.id,
            desafio_id: estado.desafioAtual.id,
            codigo_submetido: editorCodigo.value
        };
        try {
            const response = await fetch(`${apiUrl}/progresso`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosSubmissao)
            });
            const resultado = await response.json();
            if (resultado.correto) {
                mostrarModalSucesso(resultado.mensagem);
            } else {
                mostrarModalErro(resultado.mensagem, estado.desafioAtual.codigo_esperado);
            }
        } catch (error) { console.error("Erro ao verificar missão:", error); }
    });

    // Evento para o live preview do editor
    editorCodigo.addEventListener('input', () => {
        visualizadorResultado.srcdoc = editorCodigo.value;
    });

    // Evento para o botão de voltar ao mapa
    btnVoltar.addEventListener('click', () => {
        mostrarTela('tela-desafios');
        carregarDesafios(); // Recarrega para mostrar status atualizado
    });
    
    // Evento para fechar o modal de feedback
    btnModalFechar.addEventListener('click', () => {
        modalFeedback.classList.add('hidden');
    });

    btnProxima.addEventListener('click', () => {
        if (estado.explicacaoAtualIndex < explicacoes.length - 1) {
            estado.explicacaoAtualIndex++;
            renderizarExplicacoes();
        } else {
            // Se já está na última explicação, vai para os desafios E CARREGA ELES
            mostrarTela('tela-desafios');
            carregarDesafios(); // Adicione esta linha
        }
    });

    btnAnterior.addEventListener('click', () => {
        if (estado.explicacaoAtualIndex > 0) {
            estado.explicacaoAtualIndex--;
            renderizarExplicacoes();
        }
    });

    // --- INICIALIZAÇÃO ---
    // Garante que a aplicação sempre comece na tela de login
    mostrarTela('tela-login');
});