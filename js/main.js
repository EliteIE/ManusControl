// js/main-v2.js - Sistema EliteControl v2.0 com IA e CRM Avançado

// Opções padrão para gráficos Chart.js - Movido para o início para evitar referência antes da inicialização
const chartDefaultOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
            labels: { color: 'rgba(241, 245, 249, 0.8)' }
        },
        title: {
            display: false, // O título já está no card
            text: title,
            color: 'rgba(241, 245, 249, 0.9)'
        }
    },
    scales: { // Aplicável para bar, line, etc.
        y: {
            beginAtZero: true,
            grid: { color: 'rgba(51, 65, 85, 0.3)' },
            ticks: {
                color: 'rgba(241, 245, 249, 0.8)',
                callback: function(value) {
                    // Formatar como moeda se for um gráfico de receita
                    if (title && title.toLowerCase().includes('vendas') || title.toLowerCase().includes('receita')) {
                        return formatCurrency(value);
                    }
                    return value;
                }
            }
        },
        x: {
            grid: { color: 'rgba(51, 65, 85, 0.3)' },
            ticks: { color: 'rgba(241, 245, 249, 0.8)' }
        }
    }
});

// Variáveis globais
let productModal, productForm, productModalTitle, productIdField, productNameField,
    productCategoryField, productPriceField, productStockField, productLowStockAlertField,
    closeProductModalButton, cancelProductFormButton, saveProductButton;

// Controle de event listeners para evitar duplicatas
let modalEventListenersAttached = false;
let isModalProcessing = false;

// Dados de usuários de teste
const testUsers = {
    'admin@elitecontrol.com': {
        name: 'Administrador Elite',
        role: 'Dono/Gerente',
        email: 'admin@elitecontrol.com'
    },
    'estoque@elitecontrol.com': {
        name: 'Controlador de Estoque',
        role: 'Controlador de Estoque',
        email: 'estoque@elitecontrol.com'
    },
    'vendas@elitecontrol.com': {
        name: 'Vendedor Elite',
        role: 'Vendedor',
        email: 'vendas@elitecontrol.com'
    }
};

// Produtos de exemplo
const sampleProducts = [
    { name: 'Notebook Dell Inspiron', category: 'Eletrônicos', price: 2500.00, stock: 15, lowStockAlert: 10 },
    { name: 'Mouse Logitech MX Master', category: 'Periféricos', price: 320.00, stock: 8, lowStockAlert: 5 },
    { name: 'Teclado Mecânico RGB', category: 'Periféricos', price: 450.00, stock: 25, lowStockAlert: 15 },
    { name: 'Monitor 24" Full HD', category: 'Eletrônicos', price: 800.00, stock: 12, lowStockAlert: 8 },
    { name: 'SSD 500GB Samsung', category: 'Armazenamento', price: 350.00, stock: 30, lowStockAlert: 20 }
];

// === INICIALIZAÇÃO ===

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 EliteControl v2.0 inicializando...');

    initializeModalElements(); // Garante que os elementos do modal sejam inicializados globalmente
    setupEventListeners();     // Configura todos os outros event listeners, incluindo os do modal se aplicável
    firebase.auth().onAuthStateChanged(handleAuthStateChange);
});

function initializeModalElements() {
    // Esta função apenas atribui os elementos do DOM a variáveis globais.
    // Os event listeners são configurados em setupModalEventListeners.
    productModal = document.getElementById('productModal');
    productForm = document.getElementById('productForm');
    productModalTitle = document.getElementById('productModalTitle');
    productIdField = document.getElementById('productId');
    productNameField = document.getElementById('productName');
    productCategoryField = document.getElementById('productCategory');
    productPriceField = document.getElementById('productPrice');
    productStockField = document.getElementById('productStock');
    productLowStockAlertField = document.getElementById('productLowStockAlert');
    closeProductModalButton = document.getElementById('closeProductModalButton');
    cancelProductFormButton = document.getElementById('cancelProductFormButton');
    saveProductButton = document.getElementById('saveProductButton');
}

// === FUNÇÕES DE MODAL DE PRODUTOS (Definidas antes de serem usadas em setupEventListeners) ===
function setupModalEventListeners() {
    // Esta função SÓ deve ser chamada se os elementos do modal estiverem presentes na página.
    console.log("🔧 Configurando event listeners do modal de produto");

    if (closeProductModalButton) {
        closeProductModalButton.addEventListener('click', handleModalClose);
    }

    if (cancelProductFormButton) {
        cancelProductFormButton.addEventListener('click', handleModalClose);
    }

    if (productForm) {
        productForm.addEventListener('submit', handleProductFormSubmit);
    }

    if (productModal) {
        productModal.addEventListener('click', (e) => {
            if (e.target === productModal && !isModalProcessing) {
                handleModalClose();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && productModal && !productModal.classList.contains('hidden') && !isModalProcessing) {
            handleModalClose();
        }
    });
    modalEventListenersAttached = true; // Marcar que os listeners foram anexados
}


function handleModalClose() {
    if (isModalProcessing) {
        console.log("⚠️ Modal está processando, cancelamento bloqueado");
        return;
    }

    console.log("❌ Fechando modal de produto");

    try {
        if (productForm) productForm.reset();

        if (productIdField) productIdField.value = '';
        if (productNameField) productNameField.value = '';
        if (productCategoryField) productCategoryField.value = '';
        if (productPriceField) productPriceField.value = '';
        if (productStockField) productStockField.value = '';
        if (productLowStockAlertField) productLowStockAlertField.value = '';

        if (saveProductButton) {
            saveProductButton.disabled = false;
            saveProductButton.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar Produto';
        }

        if (productModal) {
            productModal.classList.add('hidden');
        }

        console.log("✅ Modal fechado com sucesso");

    } catch (error) {
        console.error("❌ Erro ao fechar modal:", error);
        if (productModal) {
            productModal.classList.add('hidden');
        }
    }
}

function openProductModal(product = null) {
    // Garante que os elementos do modal estão referenciados
    // Isso é importante se esta função for chamada antes de initializeModalElements ter certeza de rodar.
    if (!productModal) initializeModalElements();


    if (!productModal) { // Checa novamente após tentativa de inicialização
        console.error("❌ Modal de produto não encontrado mesmo após tentativa de inicialização.");
        showTemporaryAlert("Erro: Componente modal de produto não encontrado na página.", "error");
        return;
    }

    if (isModalProcessing) {
        console.log("⚠️ Modal já está sendo processado");
        return;
    }

    console.log("📝 Abrindo modal de produto:", product ? 'Editar' : 'Novo');

    if (productForm) productForm.reset();

    if (product) {
        if (productModalTitle) productModalTitle.textContent = 'Editar Produto';
        if (productIdField) productIdField.value = product.id;
        if (productNameField) productNameField.value = product.name;
        if (productCategoryField) productCategoryField.value = product.category;
        if (productPriceField) productPriceField.value = product.price;
        if (productStockField) productStockField.value = product.stock;
        if (productLowStockAlertField) productLowStockAlertField.value = product.lowStockAlert || 10;
    } else {
        if (productModalTitle) productModalTitle.textContent = 'Adicionar Novo Produto';
        if (productIdField) productIdField.value = '';
        if (productLowStockAlertField) productLowStockAlertField.value = 10; // Valor padrão
    }

    productModal.classList.remove('hidden');

    if (productNameField) {
        setTimeout(() => productNameField.focus(), 100);
    }
}

async function handleProductFormSubmit(event) {
    event.preventDefault();

    if (isModalProcessing) {
        console.log("⚠️ Formulário já está sendo processado");
        return;
    }

    console.log("💾 Salvando produto...");

    if (!validateProductForm()) {
        return;
    }

    isModalProcessing = true;

    const id = productIdField?.value;

    const productData = {
        name: productNameField.value.trim(),
        category: productCategoryField.value.trim(),
        price: parseFloat(productPriceField.value),
        stock: parseInt(productStockField.value),
        lowStockAlert: parseInt(productLowStockAlertField?.value || 10)
    };

    if (saveProductButton) {
        saveProductButton.disabled = true;
        saveProductButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Salvando...';
    }

    try {
        if (id) {
            await DataService.updateProduct(id, productData);
            showTemporaryAlert('Produto atualizado com sucesso!', 'success');
        } else {
            await DataService.addProduct(productData);
            showTemporaryAlert('Produto adicionado com sucesso!', 'success');
        }

        handleModalClose();
        await reloadProductsIfNeeded();

    } catch (error) {
        console.error("❌ Erro ao salvar produto:", error);
        showTemporaryAlert('Erro ao salvar produto. Tente novamente.', 'error');
    } finally {
        isModalProcessing = false;

        if (saveProductButton) {
            saveProductButton.disabled = false;
            saveProductButton.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar Produto';
        }
    }
}

function validateProductForm() {
    // Garante que os elementos do formulário estão referenciados
    if (!productNameField) initializeModalElements();

    if (!productNameField || !productCategoryField || !productPriceField || !productStockField || !productLowStockAlertField) {
        showTemporaryAlert("Erro: Campos do formulário de produto não encontrados.", "error");
        return false;
    }

    const name = productNameField.value.trim();
    const category = productCategoryField.value.trim();
    const price = parseFloat(productPriceField.value);
    const stock = parseInt(productStockField.value);
    const lowStockAlert = parseInt(productLowStockAlertField.value);

    if (!name) {
        showTemporaryAlert("Nome do produto é obrigatório.", "warning");
        productNameField.focus();
        return false;
    }

    if (!category) {
        showTemporaryAlert("Categoria é obrigatória.", "warning");
        productCategoryField.focus();
        return false;
    }

    if (isNaN(price) || price < 0) {
        showTemporaryAlert("Preço deve ser um número válido e não negativo.", "warning");
        productPriceField.focus();
        return false;
    }

    if (isNaN(stock) || stock < 0) {
        showTemporaryAlert("Estoque deve ser um número válido e não negativo.", "warning");
        productStockField.focus();
        return false;
    }

    if (isNaN(lowStockAlert) || lowStockAlert < 1) {
        showTemporaryAlert("Alerta de estoque baixo deve ser um número válido maior que 0.", "warning");
        productLowStockAlertField.focus();
        return false;
    }

    if (lowStockAlert > stock && stock > 0) {
        showTemporaryAlert("O alerta de estoque baixo não deve ser maior que o estoque atual.", "warning");
        productLowStockAlertField.focus();
        return false;
    }

    return true;
}

// === AUTENTICAÇÃO E NAVEGAÇÃO ===

async function handleAuthStateChange(user) {
    console.log('🔐 Estado de autenticação alterado:', user ? 'Logado' : 'Deslogado');

    if (user) {
        try {
            await ensureTestDataExists();
            let userData = await DataService.getUserData(user.uid);

            if (!userData) {
                userData = await findUserByEmail(user.email);
            }

            if (!userData && testUsers[user.email]) {
                userData = await createTestUser(user.uid, user.email);
            }

            if (userData && userData.role) {
                localStorage.setItem('elitecontrol_user_role', userData.role);
                const currentUser = { uid: user.uid, email: user.email, ...userData };

                initializeUI(currentUser);
                await handleNavigation(currentUser);

            } else {
                console.error('Dados do usuário ou cargo não encontrados para:', user.email);
                showTemporaryAlert('Não foi possível carregar os dados do seu perfil. Tente novamente.', 'error');
                await firebase.auth().signOut(); // Forçar logout se dados essenciais não forem encontrados
            }

        } catch (error) {
            console.error("❌ Erro no processo de autenticação:", error);
            showTemporaryAlert("Erro ao carregar dados do usuário.", "error");

            if (!window.location.pathname.includes('index.html')) {
                await firebase.auth().signOut();
            }
        }
    } else {
        handleLoggedOut();
    }
}

// === INTERFACE PRINCIPAL ===

function initializeUI(currentUser) {
    console.log("🎨 Inicializando interface para:", currentUser.role);

    updateUserInfo(currentUser);
    initializeNotifications();
    initializeSidebar(currentUser.role);

    if (document.getElementById('temporaryAlertsContainer') &&
        window.location.href.includes('dashboard.html') &&
        !sessionStorage.getItem('welcomeAlertShown')) {

        const userName = currentUser.name || currentUser.email.split('@')[0];
        showTemporaryAlert(`Bem-vindo, ${userName}! EliteControl v2.0 com IA`, 'success', 5000);
        sessionStorage.setItem('welcomeAlertShown', 'true');
    }
}

// === CARREGAMENTO DE SEÇÕES ===

async function loadSectionContent(sectionId, currentUser) {
    console.log(`📄 Carregando seção: ${sectionId} para usuário:`, currentUser.role);

    const dynamicContentArea = document.getElementById('dynamicContentArea');
    if (!dynamicContentArea) {
        console.error("CRITICAL: dynamicContentArea não encontrado no DOM.");
        return;
    }

    // Mostrar loading
    dynamicContentArea.innerHTML = `
        <div class="p-8 text-center text-slate-400">
            <i class="fas fa-spinner fa-spin fa-2x mb-4"></i>
            <p>Carregando ${sectionId}...</p>
        </div>
    `;

    try {
        switch (sectionId) {
            case 'produtos':
                const products = await DataService.getProducts();
                renderProductsList(products, dynamicContentArea, currentUser.role);
                break;

            case 'produtos-consulta':
                const allProducts = await DataService.getProducts();
                renderProductsConsult(allProducts, dynamicContentArea, currentUser.role);
                break;

            case 'geral':
            case 'vendas-painel':
            case 'estoque':
                await loadDashboardData(currentUser);
                break;

            case 'registrar-venda':
                renderRegisterSaleForm(dynamicContentArea, currentUser);
                break;

            case 'vendas':
                const sales = await DataService.getSales();
                renderSalesList(sales, dynamicContentArea, currentUser.role);
                break;

            case 'minhas-vendas':
                const mySales = await DataService.getSalesBySeller(currentUser.uid);
                renderSalesList(mySales, dynamicContentArea, currentUser.role, true);
                break;

            case 'clientes':
                await renderCustomersSection(dynamicContentArea, currentUser);
                break;

            case 'usuarios':
                renderUsersSection(dynamicContentArea);
                break;

            default:
                dynamicContentArea.innerHTML = `
                    <div class="p-8 text-center text-slate-400">
                        <i class="fas fa-exclamation-triangle fa-2x mb-4"></i>
                        <p>Seção "${sectionId}" em desenvolvimento ou não encontrada.</p>
                    </div>
                `;
        }
    } catch (error) {
        console.error(`❌ Erro ao carregar seção ${sectionId}:`, error);
        dynamicContentArea.innerHTML = `
            <div class="p-8 text-center text-red-400">
                <i class="fas fa-times-circle fa-2x mb-4"></i>
                <p>Erro ao carregar conteúdo da seção ${sectionId}. Tente novamente.</p>
                <p class="text-xs mt-2">${error.message}</p>
            </div>
        `;
        showTemporaryAlert(`Erro ao carregar ${sectionId}.`, 'error');
    }
}

// === CONFIGURAÇÃO DE EVENT LISTENERS ===

function setupEventListeners() {
    console.log("🔧 Configurando event listeners gerais");

    setupFormListeners();
    setupNavigationListeners();

    // A configuração dos listeners do modal de produto só deve ocorrer se os elementos do modal existirem
    // (geralmente na página dashboard.html) e se ainda não foram configurados.
    if (productModal && !modalEventListenersAttached) {
        if (typeof setupModalEventListeners === 'function') {
            setupModalEventListeners();
        } else {
            console.error("CRITICAL: A função setupModalEventListeners não está definida globalmente quando setupEventListeners é chamada.");
        }
    } else if (!productModal && window.location.pathname.includes('dashboard.html')) {
        // Se estamos no dashboard mas o modal não foi encontrado, é um problema.
        console.warn("⚠️ productModal não encontrado no dashboard.html. Listeners do modal não serão anexados.");
    }

    setupDropdownListeners();
}

// Implementação da função renderProductsList
function renderProductsList(products, container, userRole) {
    console.log("📋 Renderizando lista de produtos");
    
    // Verificar se o container existe
    if (!container) {
        console.error("Container para renderização de produtos não encontrado");
        return;
    }
    
    // Verificar permissões baseadas no papel do usuário
    const canEdit = userRole === 'Dono/Gerente' || userRole === 'Controlador de Estoque';
    const canDelete = userRole === 'Dono/Gerente';
    
    // Criar o HTML da seção de produtos
    let html = `
        <div class="products-section">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-slate-200">Gerenciamento de Produtos</h2>
                ${canEdit ? `
                <button id="addProductButton" class="btn-primary">
                    <i class="fas fa-plus mr-2"></i>Adicionar Produto
                </button>` : ''}
            </div>
            
            <div class="bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
                <div class="flex flex-col md:flex-row justify-between items-center mb-4">
                    <div class="w-full md:w-1/2 mb-4 md:mb-0">
                        <div class="relative">
                            <input type="text" id="productSearchInput" placeholder="Buscar produtos..." 
                                class="w-full bg-slate-700 text-slate-200 border border-slate-600 rounded-lg py-2 px-4 pl-10 focus:outline-none focus:border-blue-500">
                            <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
                        </div>
                    </div>
                    
                    <div class="w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                        <select id="productCategoryFilter" class="bg-slate-700 text-slate-200 border border-slate-600 rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500">
                            <option value="">Todas as categorias</option>
                            ${getUniqueCategories(products).map(category => 
                                `<option value="${category}">${category}</option>`).join('')}
                        </select>
                        
                        <select id="productStockFilter" class="bg-slate-700 text-slate-200 border border-slate-600 rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500">
                            <option value="">Todos os estoques</option>
                            <option value="low">Estoque baixo</option>
                            <option value="out">Sem estoque</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-slate-700">
                        <thead class="bg-slate-700">
                            <tr>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Produto</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Categoria</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Preço</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Estoque</th>
                                ${canEdit ? `<th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Ações</th>` : ''}
                            </tr>
                        </thead>
                        <tbody class="bg-slate-800 divide-y divide-slate-700" id="productsTableBody">
                            ${renderProductRows(products, canEdit, canDelete)}
                        </tbody>
                    </table>
                </div>
                
                <div class="bg-slate-700 px-6 py-4">
                    <p class="text-sm text-slate-400">
                        Total: <span id="productCount" class="font-semibold text-slate-200">${products.length}</span> produtos
                    </p>
                </div>
            </div>
        </div>
    `;
    
    // Inserir o HTML no container
    container.innerHTML = html;
    
    // Adicionar event listeners após renderizar o HTML
    setupProductEventListeners(products, canEdit, canDelete);
}

// Funções auxiliares para renderProductsList
function getUniqueCategories(products) {
    const categories = products.map(product => product.category);
    return [...new Set(categories)].sort();
}

function renderProductRows(products, canEdit, canDelete) {
    if (!products || products.length === 0) {
        return `
            <tr>
                <td colspan="${canEdit ? 5 : 4}" class="px-6 py-4 text-center text-slate-400">
                    Nenhum produto encontrado.
                </td>
            </tr>
        `;
    }
    
    return products.map(product => {
        const stockStatus = getStockStatusClass(product.stock, product.lowStockAlert);
        
        return `
            <tr class="hover:bg-slate-750 transition-colors" data-product-id="${product.id}">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-slate-200">${product.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-slate-300">${product.category}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-slate-300">R$ ${product.price.toFixed(2)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stockStatus.class}">
                        ${product.stock} ${stockStatus.icon}
                    </span>
                </td>
                ${canEdit ? `
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="edit-product-btn text-blue-400 hover:text-blue-300 mr-3" data-id="${product.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${canDelete ? `
                    <button class="delete-product-btn text-red-400 hover:text-red-300" data-id="${product.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>` : ''}
                </td>` : ''}
            </tr>
        `;
    }).join('');
}

function getStockStatusClass(stock, lowStockAlert) {
    if (stock <= 0) {
        return {
            class: 'bg-red-900 text-red-200',
            icon: '<i class="fas fa-times-circle ml-1"></i>'
        };
    } else if (stock <= lowStockAlert) {
        return {
            class: 'bg-yellow-900 text-yellow-200',
            icon: '<i class="fas fa-exclamation-triangle ml-1"></i>'
        };
    } else {
        return {
            class: 'bg-green-900 text-green-200',
            icon: ''
        };
    }
}

function setupProductEventListeners(products, canEdit, canDelete) {
    // Adicionar produto
    const addProductButton = document.getElementById('addProductButton');
    if (addProductButton) {
        addProductButton.addEventListener('click', () => openProductModal());
    }
    
    // Busca e filtros
    const searchInput = document.getElementById('productSearchInput');
    const categoryFilter = document.getElementById('productCategoryFilter');
    const stockFilter = document.getElementById('productStockFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', () => filterProducts(products, canEdit, canDelete));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => filterProducts(products, canEdit, canDelete));
    }
    
    if (stockFilter) {
        stockFilter.addEventListener('change', () => filterProducts(products, canEdit, canDelete));
    }
    
    // Botões de edição
    const editButtons = document.querySelectorAll('.edit-product-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const productId = button.getAttribute('data-id');
            const product = products.find(p => p.id === productId);
            if (product) {
                openProductModal(product);
            }
        });
    });
    
    // Botões de exclusão
    const deleteButtons = document.querySelectorAll('.delete-product-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const productId = button.getAttribute('data-id');
            confirmDeleteProduct(productId);
        });
    });
}

function filterProducts(products, canEdit, canDelete) {
    const searchTerm = document.getElementById('productSearchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('productCategoryFilter').value;
    const stockFilter = document.getElementById('productStockFilter').value;
    
    const filteredProducts = products.filter(product => {
        // Filtro de busca
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                             product.category.toLowerCase().includes(searchTerm);
        
        // Filtro de categoria
        const matchesCategory = !categoryFilter || product.category === categoryFilter;
        
        // Filtro de estoque
        let matchesStock = true;
        if (stockFilter === 'low') {
            matchesStock = product.stock > 0 && product.stock <= product.lowStockAlert;
        } else if (stockFilter === 'out') {
            matchesStock = product.stock <= 0;
        }
        
        return matchesSearch && matchesCategory && matchesStock;
    });
    
    const tableBody = document.getElementById('productsTableBody');
    if (tableBody) {
        tableBody.innerHTML = renderProductRows(filteredProducts, canEdit, canDelete);
        
        // Recriar event listeners para os novos botões
        const editButtons = document.querySelectorAll('.edit-product-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const productId = button.getAttribute('data-id');
                const product = products.find(p => p.id === productId);
                if (product) {
                    openProductModal(product);
                }
            });
        });
        
        const deleteButtons = document.querySelectorAll('.delete-product-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const productId = button.getAttribute('data-id');
                confirmDeleteProduct(productId);
            });
        });
    }
    
    // Atualizar contador
    const productCount = document.getElementById('productCount');
    if (productCount) {
        productCount.textContent = filteredProducts.length;
    }
}

// Implementação da função toggleProductSelection
function toggleProductSelection(productId, selected) {
    console.log(`🔄 Alternando seleção para produto ${productId}: ${selected}`);
    
    // Encontrar a linha da tabela correspondente ao produto
    const productRow = document.querySelector(`tr[data-product-id="${productId}"]`);
    
    if (productRow) {
        if (selected) {
            // Adicionar classe para indicar seleção (ex: fundo azul claro)
            productRow.classList.add("bg-blue-900", "bg-opacity-30", "selected-product-row");
        } else {
            // Remover classe de seleção
            productRow.classList.remove("bg-blue-900", "bg-opacity-30", "selected-product-row");
        }
    } else {
        console.warn(`Linha do produto ${productId} não encontrada para alternar seleção.`);
    }
}

// Implementação da função addSaleFormStyles
function addSaleFormStyles() {
    console.log("🎨 Aplicando estilos ao formulário de vendas");
    
    // Adicionar estilos específicos para o formulário de vendas
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .sale-form-container {
            background-color: #1e293b;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        .sale-form-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #334155;
        }
        
        .sale-form-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #f1f5f9;
        }
        
        .sale-form-section {
            margin-bottom: 1.5rem;
        }
        
        .sale-form-section-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #cbd5e1;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
        }
        
        .sale-form-section-title i {
            margin-right: 0.5rem;
        }
        
        .sale-form-grid {
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            gap: 1rem;
        }
        
        @media (min-width: 640px) {
            .sale-form-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (min-width: 1024px) {
            .sale-form-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }
        
        .sale-form-field {
            margin-bottom: 1rem;
        }
        
        .sale-form-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #94a3b8;
            margin-bottom: 0.5rem;
        }
        
        .sale-form-input,
        .sale-form-select,
        .sale-form-textarea {
            width: 100%;
            background-color: #334155;
            color: #f1f5f9;
            border: 1px solid #475569;
            border-radius: 0.375rem;
            padding: 0.625rem 0.75rem;
            font-size: 0.875rem;
            transition: border-color 0.15s ease-in-out;
        }
        
        .sale-form-input:focus,
        .sale-form-select:focus,
        .sale-form-textarea:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5);
        }
        
        .sale-form-textarea {
            min-height: 6rem;
            resize: vertical;
        }
        
        .sale-form-products {
            background-color: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.375rem;
            margin-bottom: 1.5rem;
            overflow: hidden;
        }
        
        .sale-form-products-header {
            background-color: #334155;
            padding: 0.75rem 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .sale-form-products-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: #e2e8f0;
        }
        
        .sale-form-products-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .sale-form-products-list {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .sale-form-product-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #334155;
        }
        
        .sale-form-product-item:last-child {
            border-bottom: none;
        }
        
        .sale-form-product-info {
            flex: 1;
        }
        
        .sale-form-product-name {
            font-size: 0.875rem;
            font-weight: 500;
            color: #e2e8f0;
            margin-bottom: 0.25rem;
        }
        
        .sale-form-product-details {
            display: flex;
            gap: 1rem;
            font-size: 0.75rem;
            color: #94a3b8;
        }
        
        .sale-form-product-quantity {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .sale-form-quantity-btn {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 1.5rem;
            height: 1.5rem;
            background-color: #334155;
            color: #e2e8f0;
            border: none;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            cursor: pointer;
            transition: background-color 0.15s ease-in-out;
        }
        
        .sale-form-quantity-btn:hover {
            background-color: #475569;
        }
        
        .sale-form-quantity-input {
            width: 2.5rem;
            text-align: center;
            background-color: #334155;
            color: #e2e8f0;
            border: 1px solid #475569;
            border-radius: 0.25rem;
            padding: 0.25rem;
            font-size: 0.75rem;
        }
        
        .sale-form-product-price {
            font-size: 0.875rem;
            font-weight: 500;
            color: #e2e8f0;
            min-width: 5rem;
            text-align: right;
        }
        
        .sale-form-product-remove {
            margin-left: 0.75rem;
            color: #ef4444;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 0.875rem;
            padding: 0.25rem;
            border-radius: 0.25rem;
            transition: background-color 0.15s ease-in-out;
        }
        
        .sale-form-product-remove:hover {
            background-color: rgba(239, 68, 68, 0.1);
        }
        
        .sale-form-summary {
            background-color: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.375rem;
            padding: 1rem;
            margin-bottom: 1.5rem;
        }
        
        .sale-form-summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
        }
        
        .sale-form-summary-label {
            font-size: 0.875rem;
            color: #94a3b8;
        }
        
        .sale-form-summary-value {
            font-size: 0.875rem;
            font-weight: 500;
            color: #e2e8f0;
        }
        
        .sale-form-summary-total {
            display: flex;
            justify-content: space-between;
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid #334155;
        }
        
        .sale-form-summary-total-label {
            font-size: 1rem;
            font-weight: 600;
            color: #e2e8f0;
        }
        
        .sale-form-summary-total-value {
            font-size: 1.125rem;
            font-weight: 700;
            color: #3b82f6;
        }
        
        .sale-form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            margin-top: 1.5rem;
        }
        
        .sale-form-cancel-btn {
            background-color: #334155;
            color: #e2e8f0;
            border: none;
            border-radius: 0.375rem;
            padding: 0.625rem 1.25rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.15s ease-in-out;
        }
        
        .sale-form-cancel-btn:hover {
            background-color: #475569;
        }
        
        .sale-form-submit-btn {
            background-color: #3b82f6;
            color: #ffffff;
            border: none;
            border-radius: 0.375rem;
            padding: 0.625rem 1.25rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.15s ease-in-out;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .sale-form-submit-btn:hover {
            background-color: #2563eb;
        }
        
        .sale-form-submit-btn:disabled {
            background-color: #64748b;
            cursor: not-allowed;
        }
        
        .sale-form-empty {
            padding: 2rem;
            text-align: center;
            color: #94a3b8;
        }
        
        .sale-form-empty i {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: #64748b;
        }
        
        .sale-form-empty-text {
            font-size: 0.875rem;
            margin-bottom: 1rem;
        }
        
        .sale-form-add-product-btn {
            background-color: #3b82f6;
            color: #ffffff;
            border: none;
            border-radius: 0.375rem;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.15s ease-in-out;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .sale-form-add-product-btn:hover {
            background-color: #2563eb;
        }
    `;
    
    // Adicionar o elemento de estilo ao head do documento
    document.head.appendChild(styleElement);
}

// Resto do código original do main.js
// ...
