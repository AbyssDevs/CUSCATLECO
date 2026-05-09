document.addEventListener('DOMContentLoaded', () => {
    let platillosDisponibles = [];
    let mesasDisponibles = [];

    // Inicialización
    init();

    async function init() {
        await cargarPlatillos();
        await cargarMesasDisponibles();
        setupEventListeners();
        // Inicializar la primera fila de platillos con los datos cargados
        const primerSelect = document.querySelector('.platillo-select');
        if (primerSelect) {
            poblarSelectPlatillos(primerSelect);
        }
    }

    async function cargarPlatillos() {
        try {
            const res = await fetch('/api/platillos');
            if (!res.ok) throw new Error('Error al cargar platillos');
            platillosDisponibles = await res.json();
        } catch (error) {
            console.error(error);
            toast('error', 'No se pudieron cargar los platillos');
        }
    }

    async function cargarMesasDisponibles() {
        try {
            const res = await fetch('/api/mesas');
            if (!res.ok) throw new Error('Error al cargar mesas');
            const todasLasMesas = await res.json();
            // Filtrar solo mesas disponibles para tomar pedido
            mesasDisponibles = todasLasMesas.filter(m => m.mesa_estado === 'Disponible');
            poblarSelectMesas();
        } catch (error) {
            console.error(error);
            toast('error', 'No se pudieron cargar las mesas');
        }
    }

    function poblarSelectMesas() {
        const mesaSelect = document.getElementById('mesa-select');
        if (!mesaSelect) return;
        
        mesaSelect.innerHTML = '<option value="">Seleccione una mesa...</option>';
        mesasDisponibles.forEach(mesa => {
            const opt = document.createElement('option');
            opt.value = mesa.id_mesa;
            opt.textContent = `Mesa ${mesa.mesa_numero} (${mesa.mesa_ubicacion})`;
            mesaSelect.appendChild(opt);
        });
    }

    function poblarSelectPlatillos(select) {
        select.innerHTML = '<option value="">Seleccione un platillo...</option>';
        platillosDisponibles.forEach(p => {
            if (p.platillo_disponible) {
                const opt = document.createElement('option');
                opt.value = p.id_platillo;
                opt.textContent = `${p.platillo_nombre} - $${p.platillo_precio}`;
                select.appendChild(opt);
            }
        });
        
        // Bloquear tipo de pedido si ya hay selecciones
        select.addEventListener('change', actualizarBloqueoTipoPedido);
    }

    function actualizarBloqueoTipoPedido() {
        const selects = document.querySelectorAll('.platillo-select');
        let algunSeleccionado = false;
        selects.forEach(s => {
            if (s.value !== "") algunSeleccionado = true;
        });

        const typeBtns = document.querySelectorAll('.pedido-type-btn');
        typeBtns.forEach(btn => {
            if (algunSeleccionado) {
                btn.classList.add('disabled-btn');
                btn.style.pointerEvents = 'none';
                btn.style.opacity = '0.6';
            } else {
                btn.classList.remove('disabled-btn');
                btn.style.pointerEvents = 'auto';
                btn.style.opacity = '1';
            }
        });
    }

    function setupEventListeners() {
        // Cambio de tipo de pedido
        document.querySelectorAll('.pedido-type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.pedido-type-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const type = this.dataset.type;
                const mesaContainer = document.getElementById('mesa-container');
                if (type === 'llevar') {
                    mesaContainer.style.display = 'none';
                } else {
                    mesaContainer.style.display = 'block';
                }
            });
        });

        // Añadir platillo
        document.getElementById('btn-add-platillo').addEventListener('click', () => {
            const container = document.getElementById('platillos-container');
            const newRow = document.createElement('div');
            newRow.className = 'platillo-row';
            newRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
            newRow.innerHTML = `
                <select class="platillo-select" style="flex: 3;">
                    <option value="">Seleccione un platillo...</option>
                </select>
                <input type="number" class="platillo-cantidad" value="1" min="1" max="99" style="flex: 1;">
                <input type="text" class="platillo-notas" placeholder="Notas (opcional)" style="flex: 2; padding: 12px 15px; border: 1px solid #ddd; border-radius: 6px;">
                <button type="button" class="btn-eliminar-fila" style="background: #dc3545; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(newRow);
            poblarSelectPlatillos(newRow.querySelector('.platillo-select'));
            actualizarBloqueoTipoPedido();
        });

        // Validaciones de cantidad y eliminación
        document.getElementById('platillos-container').addEventListener('input', (e) => {
            if (e.target.classList.contains('platillo-cantidad')) {
                let val = e.target.value;
                
                // No permitir texto, decimales, etc (solo números enteros)
                if (val !== "") {
                    let num = parseInt(val);
                    if (isNaN(num)) num = 1;
                    if (num < 1) num = 1;
                    if (num > 99) num = 99;
                    
                    // Si el valor original era diferente (ej. decimal o fuera de rango), corregir
                    if (val != num) {
                        e.target.value = num;
                    }
                }
            }
        });

        document.getElementById('platillos-container').addEventListener('change', (e) => {
            if (e.target.classList.contains('platillo-cantidad')) {
                if (e.target.value === "" || parseInt(e.target.value) < 1) {
                    e.target.value = 1;
                } else if (parseInt(e.target.value) > 99) {
                    e.target.value = 99;
                }
            }
        });

        // Eliminar fila (Delegación de eventos)
        document.getElementById('platillos-container').addEventListener('click', (e) => {
            if (e.target.closest('.btn-eliminar-fila')) {
                const rows = document.querySelectorAll('.platillo-row');
                if (rows.length > 1) {
                    e.target.closest('.platillo-row').remove();
                    actualizarBloqueoTipoPedido();
                } else {
                    toast('warning', 'Debe haber al menos un platillo en el pedido');
                }
            }
        });

        // Enviar pedido
        document.getElementById('btn-enviar-pedido').addEventListener('click', enviarPedido);
    }

    async function enviarPedido() {
        const typeBtn = document.querySelector('.pedido-type-btn.active');
        const tipo = typeBtn.dataset.type === 'salon' ? 'Salon' : 'Llevar';
        const id_mesa = tipo === 'Salon' ? document.getElementById('mesa-select').value : null;
        
        if (tipo === 'Salon' && !id_mesa) {
            toast('warning', 'Por favor seleccione una mesa');
            return;
        }

        const items = [];
        const rows = document.querySelectorAll('.platillo-row');
        rows.forEach(row => {
            const id_platillo = row.querySelector('.platillo-select').value;
            const cantidad = parseInt(row.querySelector('.platillo-cantidad').value);
            const notas = row.querySelector('.platillo-notas').value.trim();
            if (id_platillo && cantidad > 0) {
                items.push({ id_platillo, cantidad, notas });
            }
        });

        if (items.length === 0) {
            toast('warning', 'Debe seleccionar al menos un platillo válido');
            return;
        }

        try {
            const res = await fetch('/api/pedidos/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo,
                    id_mesa,
                    items
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al enviar pedido');

            toast('success', 'Pedido enviado a cocina correctamente');
            resetForm();
        } catch (error) {
            console.error(error);
            toast('error', error.message);
        }
    }

    function resetForm() {
        // Resetear tipo
        document.querySelector('.pedido-type-btn[data-type="salon"]').click();
        // Limpiar mesa
        document.getElementById('mesa-select').value = '';
        // Limpiar platillos (dejar solo una fila vacía)
        const container = document.getElementById('platillos-container');
        container.innerHTML = `
            <div class="platillo-row" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                <select class="platillo-select" style="flex: 3;">
                    <option value="">Seleccione un platillo...</option>
                </select>
                <input type="number" class="platillo-cantidad" value="1" min="1" max="99" style="flex: 1;">
                <input type="text" class="platillo-notas" placeholder="Notas (opcional)" style="flex: 2; padding: 12px 15px; border: 1px solid #ddd; border-radius: 6px;">
                <button type="button" class="btn-eliminar-fila" style="background: #dc3545; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        poblarSelectPlatillos(container.querySelector('.platillo-select'));
        actualizarBloqueoTipoPedido();
        // Recargar mesas por si se ocupó una
        cargarMesasDisponibles();
    }
});
