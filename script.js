document.addEventListener('DOMContentLoaded', () => {
    // --- Data Storage & Utils ---
    const getFromStorage = (key) => JSON.parse(localStorage.getItem(key)) || [];
    const saveToStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));

    let clientes = getFromStorage('clientes');
    let veiculos = getFromStorage('veiculos');
    let funcionarios = getFromStorage('funcionarios');
    let servicos = getFromStorage('servicos');
    let agendamentos = getFromStorage('agendamentos');
    let pagamentos = getFromStorage('pagamentos');

    const getNextId = (array) => array.length > 0 ? Math.max(...array.map(item => item.id)) + 1 : 1;

    // --- Navigation ---
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetId = link.getAttribute('data-target');
            contentSections.forEach(section => {
                section.classList.add('d-none');
                if (section.id === targetId) {
                    section.classList.remove('d-none');
                }
            });
            // Atualizar dados ao mudar de aba
            if (targetId === 'homeContent') renderHomeDashboard();
            if (targetId === 'clientesVeiculosContent') { renderClientes(); renderVeiculos(); }
            if (targetId === 'fluxoServicosContent') renderServicosAtivos();
            if (targetId === 'agendamentosContent') renderAgendamentos();
            if (targetId === 'funcionariosContent') renderFuncionarios();
            if (targetId === 'pagamentosContent') { renderServicosParaPagamento(); renderPagamentosRealizados(); }
            if (targetId === 'relatoriosContent') renderRelatorios();
        });
    });

    // --- Modals Instances (para controle programático) ---
    const modalAddCliente = new bootstrap.Modal(document.getElementById('modalAddCliente'));
    const modalAddVeiculo = new bootstrap.Modal(document.getElementById('modalAddVeiculo'));
    const modalAddServico = new bootstrap.Modal(document.getElementById('modalAddServico'));
    const modalAddAgendamento = new bootstrap.Modal(document.getElementById('modalAddAgendamento'));
    const modalAddFuncionario = new bootstrap.Modal(document.getElementById('modalAddFuncionario'));
    const modalRegistrarPagamento = new bootstrap.Modal(document.getElementById('modalRegistrarPagamento'));
    const modalComprovante = new bootstrap.Modal(document.getElementById('modalComprovante'));

    // --- Helper: Populate Select Options ---
    function populateSelect(selectId, data, valueField, textField, defaultOptionText = "Selecione") {
        const select = document.getElementById(selectId);
        select.innerHTML = `<option value="">${defaultOptionText}</option>`;
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = typeof textField === 'function' ? textField(item) : item[textField];
            select.appendChild(option);
        });
    }
    
    // --- Clientes ---
    const formAddCliente = document.getElementById('formAddCliente');
    const listaClientes = document.getElementById('listaClientes');

    formAddCliente.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('clienteId').value;
        const nome = document.getElementById('clienteNome').value;
        const cpf = document.getElementById('clienteCpf').value;
        const contato = document.getElementById('clienteContato').value;

        if (id) { // Edit
            const cliente = clientes.find(c => c.id === parseInt(id));
            cliente.nome = nome;
            cliente.cpf = cpf;
            cliente.contato = contato;
        } else { // Add
            const novoCliente = {
                id: getNextId(clientes),
                nome,
                cpf,
                contato,
                dataCadastro: new Date().toLocaleDateString('pt-BR'),
                veiculos: [] // Array of veiculo IDs
            };
            clientes.push(novoCliente);
        }
        saveToStorage('clientes', clientes);
        renderClientes();
        formAddCliente.reset();
        document.getElementById('clienteId').value = '';
        modalAddCliente.hide();
    });

    function renderClientes() {
        listaClientes.innerHTML = '';
        clientes.forEach(cliente => {
            const veiculosDoCliente = veiculos.filter(v => v.clienteId === cliente.id).map(v => v.placa).join(', ') || 'Nenhum';
            const row = listaClientes.insertRow();
            row.innerHTML = `
                <td>${cliente.nome}</td>
                <td>${cliente.cpf}</td>
                <td>${cliente.contato}</td>
                <td>${veiculosDoCliente}</td>
                <td>
                    <button class="btn btn-sm btn-warning btn-edit-cliente" data-id="${cliente.id}">Editar</button>
                    <button class="btn btn-sm btn-danger btn-delete-cliente" data-id="${cliente.id}">Excluir</button>
                </td>
            `;
        });
        populateClienteSelectors(); // Atualiza selects que usam clientes
    }

    listaClientes.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit-cliente')) {
            const id = parseInt(e.target.dataset.id);
            const cliente = clientes.find(c => c.id === id);
            document.getElementById('clienteId').value = cliente.id;
            document.getElementById('clienteNome').value = cliente.nome;
            document.getElementById('clienteCpf').value = cliente.cpf;
            document.getElementById('clienteContato').value = cliente.contato;
            modalAddCliente.show();
        }
        if (e.target.classList.contains('btn-delete-cliente')) {
            const id = parseInt(e.target.dataset.id);
            if (confirm('Tem certeza que deseja excluir este cliente? Veículos associados também serão afetados.')) {
                clientes = clientes.filter(c => c.id !== id);
                // Opcional: desassociar ou excluir veículos do cliente
                veiculos = veiculos.map(v => {
                    if (v.clienteId === id) v.clienteId = null; // ou excluir v
                    return v;
                }).filter(v => v.clienteId !== null); // Exclui se optou por deletar
                
                saveToStorage('clientes', clientes);
                saveToStorage('veiculos', veiculos);
                renderClientes();
                renderVeiculos();
            }
        }
    });

    // --- Veículos ---
    const formAddVeiculo = document.getElementById('formAddVeiculo');
    const listaVeiculos = document.getElementById('listaVeiculos');

    function populateClienteSelectors() {
        populateSelect('veiculoClienteId', clientes, 'id', 'nome', 'Selecione o Proprietário');
    }

    formAddVeiculo.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('veiculoId').value;
        const placa = document.getElementById('veiculoPlaca').value.toUpperCase();
        const modelo = document.getElementById('veiculoModelo').value;
        const ano = document.getElementById('veiculoAno').value;
        const cor = document.getElementById('veiculoCor').value;
        const clienteId = parseInt(document.getElementById('veiculoClienteId').value);

        if (id) { // Edit
            const veiculo = veiculos.find(v => v.id === parseInt(id));
            // Remover do cliente antigo se mudou
            if (veiculo.clienteId && veiculo.clienteId !== clienteId) {
                const clienteAntigo = clientes.find(c => c.id === veiculo.clienteId);
                if (clienteAntigo) clienteAntigo.veiculos = clienteAntigo.veiculos.filter(vid => vid !== veiculo.id);
            }
            veiculo.placa = placa;
            veiculo.modelo = modelo;
            veiculo.ano = ano;
            veiculo.cor = cor;
            veiculo.clienteId = clienteId;
        } else { // Add
            const novoVeiculo = {
                id: getNextId(veiculos),
                placa,
                modelo,
                ano,
                cor,
                clienteId
            };
            veiculos.push(novoVeiculo);
        }
        // Associar ao novo cliente
        if (clienteId) {
             const cliente = clientes.find(c => c.id === clienteId);
             if (cliente && !cliente.veiculos.includes(id ? parseInt(id) : veiculos[veiculos.length-1].id) ) {
                 cliente.veiculos.push(id ? parseInt(id) : veiculos[veiculos.length-1].id);
             }
        }

        saveToStorage('veiculos', veiculos);
        saveToStorage('clientes', clientes); // Salva clientes por causa da associação
        renderVeiculos();
        renderClientes(); // Atualiza lista de veículos dos clientes
        formAddVeiculo.reset();
        document.getElementById('veiculoId').value = '';
        modalAddVeiculo.hide();
    });

    function renderVeiculos() {
        listaVeiculos.innerHTML = '';
        veiculos.forEach(veiculo => {
            const proprietario = clientes.find(c => c.id === veiculo.clienteId);
            const row = listaVeiculos.insertRow();
            row.innerHTML = `
                <td>${veiculo.placa}</td>
                <td>${veiculo.modelo}</td>
                <td>${veiculo.ano}</td>
                <td>${veiculo.cor}</td>
                <td>${proprietario ? proprietario.nome : 'Sem proprietário'}</td>
                <td>
                    <button class="btn btn-sm btn-warning btn-edit-veiculo" data-id="${veiculo.id}">Editar</button>
                    <button class="btn btn-sm btn-danger btn-delete-veiculo" data-id="${veiculo.id}">Excluir</button>
                </td>
            `;
        });
        populateVeiculoSelectors(); // Atualiza selects que usam veículos
    }
    
    listaVeiculos.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit-veiculo')) {
            const id = parseInt(e.target.dataset.id);
            const veiculo = veiculos.find(v => v.id === id);
            document.getElementById('veiculoId').value = veiculo.id;
            document.getElementById('veiculoPlaca').value = veiculo.placa;
            document.getElementById('veiculoModelo').value = veiculo.modelo;
            document.getElementById('veiculoAno').value = veiculo.ano;
            document.getElementById('veiculoCor').value = veiculo.cor;
            document.getElementById('veiculoClienteId').value = veiculo.clienteId || "";
            modalAddVeiculo.show();
        }
        if (e.target.classList.contains('btn-delete-veiculo')) {
            const id = parseInt(e.target.dataset.id);
            if (confirm('Tem certeza que deseja excluir este veículo?')) {
                const veiculo = veiculos.find(v => v.id === id);
                if(veiculo && veiculo.clienteId){
                    const cliente = clientes.find(c => c.id === veiculo.clienteId);
                    if(cliente) cliente.veiculos = cliente.veiculos.filter(vid => vid !== id);
                }
                veiculos = veiculos.filter(v => v.id !== id);
                saveToStorage('veiculos', veiculos);
                saveToStorage('clientes', clientes);
                renderVeiculos();
                renderClientes();
            }
        }
    });

    // --- Funcionários ---
    const formAddFuncionario = document.getElementById('formAddFuncionario');
    const listaFuncionarios = document.getElementById('listaFuncionarios');

    formAddFuncionario.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('funcionarioId').value;
        const nome = document.getElementById('funcionarioNome').value;
        const cargo = document.getElementById('funcionarioCargo').value;

        if (id) { // Edit
            const funcionario = funcionarios.find(f => f.id === parseInt(id));
            funcionario.nome = nome;
            funcionario.cargo = cargo;
        } else { // Add
            funcionarios.push({ id: getNextId(funcionarios), nome, cargo });
        }
        saveToStorage('funcionarios', funcionarios);
        renderFuncionarios();
        formAddFuncionario.reset();
        document.getElementById('funcionarioId').value = '';
        modalAddFuncionario.hide();
    });

    function renderFuncionarios() {
        listaFuncionarios.innerHTML = '';
        funcionarios.forEach(func => {
            const row = listaFuncionarios.insertRow();
            row.innerHTML = `
                <td>${func.nome}</td>
                <td>${func.cargo}</td>
                <td>
                    <button class="btn btn-sm btn-warning btn-edit-funcionario" data-id="${func.id}">Editar</button>
                    <button class="btn btn-sm btn-danger btn-delete-funcionario" data-id="${func.id}">Excluir</button>
                </td>
            `;
        });
        populateFuncionarioSelectors();
    }

    listaFuncionarios.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit-funcionario')) {
            const id = parseInt(e.target.dataset.id);
            const funcionario = funcionarios.find(f => f.id === id);
            document.getElementById('funcionarioId').value = funcionario.id;
            document.getElementById('funcionarioNome').value = funcionario.nome;
            document.getElementById('funcionarioCargo').value = funcionario.cargo;
            modalAddFuncionario.show();
        }
        if (e.target.classList.contains('btn-delete-funcionario')) {
            const id = parseInt(e.target.dataset.id);
            if (confirm('Tem certeza que deseja excluir este funcionário?')) {
                funcionarios = funcionarios.filter(f => f.id !== id);
                saveToStorage('funcionarios', funcionarios);
                renderFuncionarios();
            }
        }
    });

    // --- Fluxo de Serviços ---
    const formAddServico = document.getElementById('formAddServico');
    const listaServicosAtivos = document.getElementById('listaServicosAtivos');

    function populateVeiculoSelectors() {
        populateSelect('servicoVeiculoId', veiculos, 'id', (v) => `${v.placa} - ${v.modelo}`, 'Selecione o Veículo');
    }
    function populateFuncionarioSelectors() {
        populateSelect('servicoFuncionarioId', funcionarios, 'id', 'nome', 'Nenhum');
    }

    formAddServico.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('servicoId').value;
        const veiculoId = parseInt(document.getElementById('servicoVeiculoId').value);
        const tipoServico = document.getElementById('servicoTipo').value;
        const valor = parseFloat(document.getElementById('servicoValor').value);
        const funcionarioId = document.getElementById('servicoFuncionarioId').value ? parseInt(document.getElementById('servicoFuncionarioId').value) : null;
        
        if (id) { // Edit (atualizar status, funcionario, etc)
            const servico = servicos.find(s => s.id === parseInt(id));
            servico.veiculoId = veiculoId;
            servico.tipoServico = tipoServico;
            servico.valor = valor;
            servico.funcionarioId = funcionarioId;
            servico.status = document.getElementById('servicoStatus').value;
            if (servico.status === 'Concluído' && !servico.dataSaida) {
                servico.dataSaida = new Date().toISOString();
            }
        } else { // Add new service
            const novoServico = {
                id: getNextId(servicos),
                veiculoId,
                tipoServico,
                valor,
                funcionarioId,
                dataEntrada: new Date().toISOString(),
                dataSaida: null,
                status: 'Em Espera', // Ou 'Em Serviço' se já atribuir funcionário
                pago: false
            };
            if (funcionarioId) novoServico.status = 'Em Serviço';
            servicos.push(novoServico);
        }
        saveToStorage('servicos', servicos);
        renderServicosAtivos();
        renderHomeDashboard();
        renderServicosParaPagamento();
        renderRelatorios();
        formAddServico.reset();
        document.getElementById('servicoId').value = '';
        document.getElementById('servicoModalTitle').textContent = 'Registrar Entrada de Veículo';
        document.getElementById('divServicoStatus').style.display = 'none';
        modalAddServico.hide();
    });

    function renderServicosAtivos() {
        listaServicosAtivos.innerHTML = '';
        const ativos = servicos.filter(s => s.status === 'Em Espera' || s.status === 'Em Serviço');
        ativos.forEach(servico => {
            const veiculo = veiculos.find(v => v.id === servico.veiculoId);
            const funcionario = funcionarios.find(f => f.id === servico.funcionarioId);
            const row = listaServicosAtivos.insertRow();
            row.innerHTML = `
                <td>${veiculo ? veiculo.placa : 'N/A'}</td>
                <td>${veiculo ? veiculo.modelo : 'N/A'}</td>
                <td>${servico.tipoServico}</td>
                <td>${funcionario ? funcionario.nome : 'Não atribuído'}</td>
                <td>${new Date(servico.dataEntrada).toLocaleString('pt-BR')}</td>
                <td><span class="badge bg-${servico.status === 'Em Espera' ? 'warning' : 'info'}">${servico.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info btn-edit-servico" data-id="${servico.id}">Gerenciar</button>
                    ${servico.status !== 'Concluído' ? `<button class="btn btn-sm btn-success btn-concluir-servico" data-id="${servico.id}">Concluir</button>` : ''}
                    <button class="btn btn-sm btn-danger btn-cancelar-servico" data-id="${servico.id}">Cancelar</button>
                </td>
            `;
        });
    }
    
    listaServicosAtivos.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.classList.contains('btn-edit-servico')) {
            const servico = servicos.find(s => s.id === id);
            document.getElementById('servicoId').value = servico.id;
            document.getElementById('servicoVeiculoId').value = servico.veiculoId;
            document.getElementById('servicoTipo').value = servico.tipoServico;
            document.getElementById('servicoValor').value = servico.valor;
            document.getElementById('servicoFuncionarioId').value = servico.funcionarioId || "";
            document.getElementById('servicoStatus').value = servico.status;
            document.getElementById('servicoModalTitle').textContent = 'Gerenciar Serviço';
            document.getElementById('divServicoStatus').style.display = 'block';
            modalAddServico.show();
        }
        if (e.target.classList.contains('btn-concluir-servico')) {
            const servico = servicos.find(s => s.id === id);
            if (servico) {
                servico.status = 'Concluído';
                servico.dataSaida = new Date().toISOString();
                saveToStorage('servicos', servicos);
                renderServicosAtivos();
                renderHomeDashboard();
                renderServicosParaPagamento();
                renderRelatorios();
            }
        }
        if (e.target.classList.contains('btn-cancelar-servico')) {
            if (confirm('Tem certeza que deseja cancelar este serviço?')) {
                const servico = servicos.find(s => s.id === id);
                if (servico) {
                    servico.status = 'Cancelado';
                    servico.dataSaida = new Date().toISOString(); // Pode ser útil registrar quando foi cancelado
                    saveToStorage('servicos', servicos);
                    renderServicosAtivos();
                    renderHomeDashboard();
                    renderRelatorios();
                }
            }
        }
    });

    // --- Agendamentos ---
    const formAddAgendamento = document.getElementById('formAddAgendamento');
    const listaAgendamentos = document.getElementById('listaAgendamentos');

    formAddAgendamento.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('agendamentoId').value;
        const clienteNome = document.getElementById('agendamentoClienteNome').value;
        const veiculoInfo = document.getElementById('agendamentoVeiculoInfo').value;
        const dataHora = document.getElementById('agendamentoDataHora').value;
        const servicoDesejado = document.getElementById('agendamentoServicoDesejado').value;

        if (id) { // Edit
            const ag = agendamentos.find(a => a.id === parseInt(id));
            ag.clienteNome = clienteNome;
            ag.veiculoInfo = veiculoInfo;
            ag.dataHora = dataHora;
            ag.servicoDesejado = servicoDesejado;
        } else { // Add
            agendamentos.push({
                id: getNextId(agendamentos),
                clienteNome,
                veiculoInfo,
                dataHora,
                servicoDesejado,
                status: 'Pendente' // Pendente, Confirmado, Realizado, Cancelado
            });
        }
        agendamentos.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora)); // Ordena por data
        saveToStorage('agendamentos', agendamentos);
        renderAgendamentos();
        renderHomeDashboard();
        formAddAgendamento.reset();
        document.getElementById('agendamentoId').value = '';
        modalAddAgendamento.hide();
    });

    function renderAgendamentos() {
        listaAgendamentos.innerHTML = '';
        const agora = new Date();
        const agendamentosFiltrados = agendamentos.filter(ag => new Date(ag.dataHora) >= agora || ag.status === 'Pendente' || ag.status === 'Confirmado');

        if (agendamentosFiltrados.length === 0) {
            listaAgendamentos.innerHTML = '<p class="text-muted">Nenhum agendamento futuro.</p>';
            return;
        }

        agendamentosFiltrados.forEach(ag => {
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action flex-column align-items-start';
            const dataHoraFormatada = new Date(ag.dataHora).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'});
            
            let statusBadge = '';
            if (ag.status === 'Pendente') statusBadge = `<span class="badge bg-warning text-dark">Pendente</span>`;
            else if (ag.status === 'Confirmado') statusBadge = `<span class="badge bg-info">Confirmado</span>`;
            else if (ag.status === 'Realizado') statusBadge = `<span class="badge bg-success">Realizado</span>`;
            else if (ag.status === 'Cancelado') statusBadge = `<span class="badge bg-danger">Cancelado</span>`;

            item.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${ag.clienteNome} - ${ag.veiculoInfo}</h5>
                    <small>${dataHoraFormatada} ${statusBadge}</small>
                </div>
                <p class="mb-1">Serviço: ${ag.servicoDesejado}</p>
                <small>
                    <button class="btn btn-sm btn-outline-primary btn-edit-agendamento" data-id="${ag.id}">Editar</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-agendamento" data-id="${ag.id}">Cancelar</button>
                    ${ag.status === 'Pendente' ? `<button class="btn btn-sm btn-outline-success btn-confirmar-agendamento" data-id="${ag.id}">Confirmar</button>` : ''}
                </small>
            `;
            listaAgendamentos.appendChild(item);
        });
    }

    listaAgendamentos.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.classList.contains('btn-edit-agendamento')) {
            const ag = agendamentos.find(a => a.id === id);
            document.getElementById('agendamentoId').value = ag.id;
            document.getElementById('agendamentoClienteNome').value = ag.clienteNome;
            document.getElementById('agendamentoVeiculoInfo').value = ag.veiculoInfo;
            document.getElementById('agendamentoDataHora').value = ag.dataHora;
            document.getElementById('agendamentoServicoDesejado').value = ag.servicoDesejado;
            modalAddAgendamento.show();
        }
        if (e.target.classList.contains('btn-delete-agendamento')) { // Logicamente um cancelamento
            if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
                const ag = agendamentos.find(a => a.id === id);
                ag.status = 'Cancelado';
                // agendamentos = agendamentos.filter(a => a.id !== id); // ou marcar como cancelado
                saveToStorage('agendamentos', agendamentos);
                renderAgendamentos();
                renderHomeDashboard();
            }
        }
        if (e.target.classList.contains('btn-confirmar-agendamento')) {
            const ag = agendamentos.find(a => a.id === id);
            ag.status = 'Confirmado';
            saveToStorage('agendamentos', agendamentos);
            renderAgendamentos();
            renderHomeDashboard();
        }
    });
    
    // --- Pagamentos ---
    const formRegistrarPagamento = document.getElementById('formRegistrarPagamento');
    const listaServicosParaPagamento = document.getElementById('listaServicosParaPagamento');
    const listaPagamentosRealizados = document.getElementById('listaPagamentosRealizados');

    function renderServicosParaPagamento() {
        listaServicosParaPagamento.innerHTML = '';
        const aPagar = servicos.filter(s => s.status === 'Concluído' && !s.pago);
        aPagar.forEach(servico => {
            const veiculo = veiculos.find(v => v.id === servico.veiculoId);
            const cliente = veiculo ? clientes.find(c => c.id === veiculo.clienteId) : null;
            const row = listaServicosParaPagamento.insertRow();
            row.innerHTML = `
                <td>${veiculo ? veiculo.placa : 'N/A'}</td>
                <td>${cliente ? cliente.nome : 'N/A'}</td>
                <td>${servico.tipoServico}</td>
                <td>R$ ${servico.valor.toFixed(2)}</td>
                <td><button class="btn btn-sm btn-success btn-registrar-pagamento" data-id="${servico.id}">Registrar Pagamento</button></td>
            `;
        });
    }

    listaServicosParaPagamento.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-registrar-pagamento')) {
            const id = parseInt(e.target.dataset.id);
            const servico = servicos.find(s => s.id === id);
            const veiculo = veiculos.find(v => v.id === servico.veiculoId);
            document.getElementById('pagamentoServicoId').value = servico.id;
            document.getElementById('pagamentoInfoServico').textContent = `${servico.tipoServico} - ${veiculo.placa}`;
            document.getElementById('pagamentoInfoValor').textContent = `R$ ${servico.valor.toFixed(2)}`;
            modalRegistrarPagamento.show();
        }
    });

    formRegistrarPagamento.addEventListener('submit', (e) => {
        e.preventDefault();
        const servicoId = parseInt(document.getElementById('pagamentoServicoId').value);
        const formaPagamento = document.getElementById('pagamentoForma').value;
        
        const servico = servicos.find(s => s.id === servicoId);
        if (servico) {
            servico.pago = true;
            const novoPagamento = {
                id: getNextId(pagamentos),
                servicoId,
                dataPagamento: new Date().toISOString(),
                valor: servico.valor,
                formaPagamento
            };
            pagamentos.push(novoPagamento);
            
            saveToStorage('servicos', servicos);
            saveToStorage('pagamentos', pagamentos);
            renderServicosParaPagamento();
            renderPagamentosRealizados();
            renderRelatorios();
            formRegistrarPagamento.reset();
            modalRegistrarPagamento.hide();
            alert('Pagamento registrado com sucesso!');
        }
    });

    function renderPagamentosRealizados() {
        listaPagamentosRealizados.innerHTML = '';
        pagamentos.sort((a,b) => new Date(b.dataPagamento) - new Date(a.dataPagamento) ); // Mais recentes primeiro
        pagamentos.forEach(pag => {
            const servico = servicos.find(s => s.id === pag.servicoId);
            const veiculo = servico ? veiculos.find(v => v.id === servico.veiculoId) : null;
            const row = listaPagamentosRealizados.insertRow();
            row.innerHTML = `
                <td>${new Date(pag.dataPagamento).toLocaleString('pt-BR')}</td>
                <td>${servico ? servico.tipoServico : 'N/A'} (${veiculo ? veiculo.placa : 'N/A'})</td>
                <td>R$ ${pag.valor.toFixed(2)}</td>
                <td>${pag.formaPagamento}</td>
                <td><button class="btn btn-sm btn-outline-secondary btn-ver-comprovante" data-id="${pag.id}">Ver</button></td>
            `;
        });
    }
    
    listaPagamentosRealizados.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-ver-comprovante')) {
            const id = parseInt(e.target.dataset.id);
            const pagamento = pagamentos.find(p => p.id === id);
            const servico = servicos.find(s => s.id === pagamento.servicoId);
            const veiculo = servico ? veiculos.find(v => v.id === servico.veiculoId) : null;
            const cliente = veiculo ? clientes.find(c => c.id === veiculo.clienteId) : null;

            const comprovanteConteudo = `
LAVA-RÁPIDO XPTO
-----------------------------------------
COMPROVANTE DE PAGAMENTO
-----------------------------------------
Data/Hora: ${new Date(pagamento.dataPagamento).toLocaleString('pt-BR')}
Cliente: ${cliente ? cliente.nome : 'N/A'}
Veículo: ${veiculo ? `${veiculo.placa} - ${veiculo.modelo}` : 'N/A'}
Serviço: ${servico ? servico.tipoServico : 'N/A'}
Valor: R$ ${pagamento.valor.toFixed(2)}
Forma de Pagamento: ${pagamento.formaPagamento}
-----------------------------------------
Obrigado pela preferência!
            `;
            document.getElementById('comprovanteConteudo').textContent = comprovanteConteudo.trim();
            modalComprovante.show();
        }
    });

    // --- Relatórios ---
    function renderRelatorios() {
        const hoje = new Date().toLocaleDateString('pt-BR');
        let atendimentosHoje = 0;
        let faturamentoHoje = 0;

        const historicoServicosBody = document.getElementById('historicoServicos');
        historicoServicosBody.innerHTML = '';

        const servicosConcluidosPagos = servicos.filter(s => s.status === 'Concluído' && s.pago);
        servicosConcluidosPagos.sort((a,b) => new Date(b.dataSaida) - new Date(a.dataSaida) );

        servicosConcluidosPagos.forEach(servico => {
            const dataSaidaFormatada = new Date(servico.dataSaida).toLocaleDateString('pt-BR');
            if (dataSaidaFormatada === hoje) {
                atendimentosHoje++;
                faturamentoHoje += servico.valor;
            }

            const veiculo = veiculos.find(v => v.id === servico.veiculoId);
            const cliente = veiculo ? clientes.find(c => c.id === veiculo.clienteId) : null;
            const funcionario = funcionarios.find(f => f.id === servico.funcionarioId);

            const row = historicoServicosBody.insertRow();
            row.innerHTML = `
                <td>${new Date(servico.dataSaida).toLocaleString('pt-BR')}</td>
                <td>${veiculo ? veiculo.placa : 'N/A'}</td>
                <td>${cliente ? cliente.nome : 'N/A'}</td>
                <td>${servico.tipoServico}</td>
                <td>R$ ${servico.valor.toFixed(2)}</td>
                <td>${funcionario ? funcionario.nome : 'N/A'}</td>
            `;
        });

        document.getElementById('atendimentosHoje').textContent = atendimentosHoje;
        document.getElementById('faturamentoHoje').textContent = `R$ ${faturamentoHoje.toFixed(2)}`;
    }

    // --- Home Dashboard ---
    function renderHomeDashboard() {
        // Veículos em Serviço
        const ulVeiculosEmServico = document.getElementById('veiculosEmServicoHome');
        ulVeiculosEmServico.innerHTML = '';
        const emServico = servicos.filter(s => s.status === 'Em Serviço');
        if (emServico.length > 0) {
            emServico.forEach(s => {
                const veiculo = veiculos.find(v => v.id === s.veiculoId);
                const funcionario = funcionarios.find(f => f.id === s.funcionarioId);
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = `${veiculo ? veiculo.placa : 'N/A'} (${s.tipoServico}) - ${funcionario ? funcionario.nome : 'Não atribuído'}`;
                ulVeiculosEmServico.appendChild(li);
            });
        } else {
            ulVeiculosEmServico.innerHTML = '<li class="list-group-item">Nenhum veículo em serviço.</li>';
        }

        // Próximos Agendamentos (ex: próximos 3)
        const ulProximosAgendamentos = document.getElementById('proximosAgendamentosHome');
        ulProximosAgendamentos.innerHTML = '';
        const agora = new Date();
        const proximos = agendamentos
            .filter(ag => (ag.status === 'Pendente' || ag.status === 'Confirmado') && new Date(ag.dataHora) >= agora)
            .sort((a,b) => new Date(a.dataHora) - new Date(b.dataHora))
            .slice(0, 3); // Pega os 3 mais próximos

        if (proximos.length > 0) {
            proximos.forEach(ag => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = `${new Date(ag.dataHora).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} - ${ag.clienteNome} (${ag.veiculoInfo})`;
                ulProximosAgendamentos.appendChild(li);
            });
        } else {
            ulProximosAgendamentos.innerHTML = '<li class="list-group-item">Nenhum agendamento próximo.</li>';
        }
    }

    // --- Initial Renders ---
    function initializeApp() {
        renderClientes();
        renderVeiculos();
        renderFuncionarios();
        renderServicosAtivos();
        renderAgendamentos();
        renderServicosParaPagamento();
        renderPagamentosRealizados();
        renderRelatorios();
        renderHomeDashboard(); // Para a aba inicial
        
        // Popula selects que dependem de dados já carregados
        populateClienteSelectors();
        populateVeiculoSelectors();
        populateFuncionarioSelectors();
    }

    initializeApp();
});
