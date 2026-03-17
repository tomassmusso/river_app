document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-partido');
    const tablaBody = document.getElementById('tabla-body');
    const filtroAnio = document.getElementById('filtro-anio');
    const contenedorGoleadores = document.getElementById('contenedor-goleadores');
    const modalPartido = new bootstrap.Modal(document.getElementById('modalPartido'));

    // --- INICIALIZACIÓN ---
    const configs = {
        'config_ubicaciones': ['Sívori Alta', 'Sívori Baja', 'Belgrano Alta', 'San Martín Alta', 'Centenario Alta'],
        'config_entrenadores': ['Marcelo Gallardo', 'Martín Demichelis', 'Eduardo Coudet']
    };

    Object.keys(configs).forEach(key => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(configs[key]));
    });

    actualizarSelectsConfig();
    cargarPartidos();

    // --- GOLEADORES ---
    window.agregarInputGoleador = (nombre = '', cantidad = 1) => {
        const div = document.createElement('div');
        div.className = 'row g-2 goleador-input align-items-center mb-2 p-2 bg-light rounded';
        div.innerHTML = `
            <div class="col-7"><input type="text" class="form-control form-control-sm gol-nombre" placeholder="Jugador" value="${nombre}"></div>
            <div class="col-3"><input type="number" class="form-control form-control-sm gol-cantidad" value="${cantidad}" min="1"></div>
            <div class="col-2 text-end"><button type="button" class="btn btn-sm text-danger" onclick="this.parentElement.parentElement.remove()">✕</button></div>
        `;
        contenedorGoleadores.appendChild(div);
    };

    window.prepararNuevo = () => {
        document.getElementById('modalTitle').innerText = 'Registrar Partido';
        document.getElementById('edit-id').value = ''; // Limpiar ID de edición
        form.reset();
        contenedorGoleadores.innerHTML = '';
        modalPartido.show();
    };

    // --- GUARDAR (NUEVO O EDITAR) ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const listaGoleadores = [];
        document.querySelectorAll('.goleador-input').forEach(row => {
            const n = row.querySelector('.gol-nombre').value.trim();
            const c = parseInt(row.querySelector('.gol-cantidad').value);
            if (n) listaGoleadores.push({ nombre: n, cantidad: c });
        });

        const idEditando = document.getElementById('edit-id').value;
        const partidos = JSON.parse(localStorage.getItem('partidosRiver')) || [];

        const datosPartido = {
            id: idEditando ? parseInt(idEditando) : Date.now(),
            partido: document.getElementById('partido').value.trim(),
            fecha: document.getElementById('fecha').value,
            resultado: `${document.getElementById('goles-river').value}-${document.getElementById('goles-rival').value}`,
            competicion: document.getElementById('competicion').value,
            instancia: document.getElementById('instancia').value.trim(),
            entrenador: document.getElementById('entrenador').value,
            ubicacion: document.getElementById('ubicacion').value,
            goleadores: listaGoleadores,
            notas: document.getElementById('notas').value
        };

        if (idEditando) {
            // Reemplazar el existente
            const index = partidos.findIndex(p => p.id === parseInt(idEditando));
            if (index !== -1) partidos[index] = datosPartido;
        } else {
            // Agregar nuevo
            partidos.push(datosPartido);
        }

        localStorage.setItem('partidosRiver', JSON.stringify(partidos));
        form.reset();
        modalPartido.hide();
        cargarPartidos();
    });

    // --- CARGAR PARTIDOS EN TABLA ---
    function cargarPartidos() {
        const partidos = JSON.parse(localStorage.getItem('partidosRiver')) || [];
        tablaBody.innerHTML = '';
        actualizarSelectAnios(partidos);

        const filtrados = filtroAnio.value === 'todos' ? partidos : partidos.filter(p => p.fecha.startsWith(filtroAnio.value));
        filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        filtrados.forEach(p => {
            const scores = p.resultado.split('-').map(n => parseInt(n));
            const colorClass = scores[0] > scores[1] ? 'badge-win' : (scores[0] < scores[1] ? 'badge-loss' : 'badge-draw');
            const [y, m, d] = p.fecha.split('-');
            const textoGoles = p.goleadores?.map(g => g.cantidad > 1 ? `${g.nombre} (${g.cantidad})` : g.nombre).join(', ') || '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
    <td class="small text-muted">${d}/${m}/${y}</td>
    <td class="fw-bold">${p.partido}</td>
    <td><span class="badge ${colorClass}">${p.resultado}</span></td>
    <td><small>${p.competicion}</small></td>
    <td><button class="btn btn-sm btn-light border" onclick="toggleDetalle(${p.id})">Notas</button></td>
    <td>
        <div class="acciones-container">
            <button class="btn btn-link btn-edit p-0" onclick="editarPartido(${p.id})">✏️</button>
            <button class="btn btn-link text-danger p-0" onclick="eliminar(${p.id})">🗑️</button>
        </div>
    </td>
`;
            const trDetalle = document.createElement('tr');
            trDetalle.id = `detalle-${p.id}`;
            trDetalle.className = 'd-none';
            trDetalle.innerHTML = `
                <td colspan="6" class="p-3 bg-light shadow-inner">
                    <div class="row g-3 small">
                        <div class="col-md-3"><strong>📍 Instancia:</strong><br>${p.instancia || '-'}</div>
                        <div class="col-md-3"><strong>👔 DT:</strong><br>${p.entrenador || '-'}</div>
                        <div class="col-md-3"><strong>🏟️ Lugar:</strong><br>${p.ubicacion || '-'}</div>
                        <div class="col-md-3"><strong>⚽ Goles:</strong><br>${textoGoles}</div>
                    </div>
                    <p class="mt-3 mb-0 small text-secondary"><strong>📝 Notas:</strong> ${p.notas || 'Sin anotaciones.'}</p>
                </td>
            `;
            tablaBody.appendChild(tr); tablaBody.appendChild(trDetalle);
        });
    }

    // --- EDITAR REGISTRO ---
    window.editarPartido = (id) => {
        const partidos = JSON.parse(localStorage.getItem('partidosRiver')) || [];
        const p = partidos.find(partido => partido.id === id);
        if (!p) return;

        document.getElementById('modalTitle').innerText = 'Editar Partido';
        document.getElementById('edit-id').value = p.id;
        document.getElementById('partido').value = p.partido;
        document.getElementById('fecha').value = p.fecha;
        
        const scores = p.resultado.split('-');
        document.getElementById('goles-river').value = scores[0];
        document.getElementById('goles-rival').value = scores[1];
        
        document.getElementById('competicion').value = p.competicion;
        document.getElementById('instancia').value = p.instancia || '';
        document.getElementById('entrenador').value = p.entrenador;
        document.getElementById('ubicacion').value = p.ubicacion;
        document.getElementById('notas').value = p.notas || '';

        // Cargar goleadores
        contenedorGoleadores.innerHTML = '';
        if (p.goleadores && p.goleadores.length > 0) {
            p.goleadores.forEach(g => agregarInputGoleador(g.nombre, g.cantidad));
        }

        modalPartido.show();
    };

    // --- ESTADÍSTICAS ---
    window.generarEstadisticas = () => {
        const partidos = JSON.parse(localStorage.getItem('partidosRiver')) || [];
        let v = 0, e = 0, d = 0;
        const golesMap = {}, rivalesMap = {}, lugaresMap = {}, dtsMap = {};

        partidos.forEach(p => {
            const s = p.resultado.split('-').map(n => parseInt(n));
            if (s[0] > s[1]) v++; else if (s[0] < s[1]) d++; else e++;

            p.goleadores?.forEach(g => {
                const n = g.nombre.trim().toUpperCase();
                if(n) golesMap[n] = (golesMap[n] || 0) + g.cantidad;
            });
            const riv = p.partido?.trim().toUpperCase();
            if(riv) rivalesMap[riv] = (rivalesMap[riv] || 0) + 1;
            const lug = p.ubicacion?.trim().toUpperCase();
            if(lug) lugaresMap[lug] = (lugaresMap[lug] || 0) + 1;
            const dt = p.entrenador?.trim().toUpperCase();
            if(dt) dtsMap[dt] = (dtsMap[dt] || 0) + 1;
        });

        const total = partidos.length || 0;
        const efec = total > 0 ? ((v * 3 + e) / (total * 3) * 100).toFixed(1) : 0;

        document.getElementById('tab-rendimiento').innerHTML = `
            <div class="py-4">
                <div class="mb-2">
                    <div class="stats-secondary-number">${total}</div>
                    <div class="stats-label">Partidos Totales</div>
                </div>
                <div class="my-4 pt-3 pb-3 border-top border-bottom">
                    <div class="stats-main-number">${efec}%</div>
                    <div class="stats-label">Efectividad Total</div>
                </div>
                <div class="d-flex justify-content-around mt-3">
                    <div><div class="stats-secondary-number fw-bold">${v}</div><div class="stats-label">Ganados</div></div>
                    <div><div class="stats-secondary-number fw-bold">${e}</div><div class="stats-label">Empatados</div></div>
                    <div><div class="stats-secondary-number fw-bold">${d}</div><div class="stats-label">Perdidos</div></div>
                </div>
            </div>
        `;

        renderList('tab-goleadores', golesMap);
        renderList('tab-rivales', rivalesMap);
        renderList('tab-lugares', lugaresMap);
        renderList('tab-dts', dtsMap);
    };

    function renderList(id, obj) {
        const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
        let html = sorted.length ? '<ul class="list-group list-group-flush text-start mt-2">' : '<p class="p-3 text-muted">Sin datos.</p>';
        sorted.forEach(([k, v]) => {
            html += `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent py-2">
                <span class="small fw-bold">${k}</span><span class="badge bg-danger rounded-pill">${v}</span></li>`;
        });
        document.getElementById(id).innerHTML = html + (sorted.length ? '</ul>' : '');
    }

    // --- BACKUP ---
    window.exportarDatos = () => {
        const datos = {
            partidos: JSON.parse(localStorage.getItem('partidosRiver')) || [],
            lugar: JSON.parse(localStorage.getItem('config_ubicaciones')),
            dt: JSON.parse(localStorage.getItem('config_entrenadores'))
        };
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `river_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    window.importarDatos = (event) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const d = JSON.parse(e.target.result);
            if (confirm('¿Importar datos?')) {
                localStorage.setItem('partidosRiver', JSON.stringify(d.partidos || []));
                localStorage.setItem('config_ubicaciones', JSON.stringify(d.lugar || []));
                localStorage.setItem('config_entrenadores', JSON.stringify(d.dt || []));
                location.reload();
            }
        };
        reader.readAsText(event.target.files[0]);
    };

    // --- CONFIG ---
    window.agregarOpcion = (tipo, inputId) => {
        const val = document.getElementById(inputId).value.trim();
        if (!val) return;
        const lista = JSON.parse(localStorage.getItem(`config_${tipo}`));
        lista.push(val);
        localStorage.setItem(`config_${tipo}`, JSON.stringify([...new Set(lista)]));
        document.getElementById(inputId).value = '';
        actualizarSelectsConfig();
    };

    window.eliminarOpcion = (tipo, valor) => {
        let lista = JSON.parse(localStorage.getItem(`config_${tipo}`));
        localStorage.setItem(`config_${tipo}`, JSON.stringify(lista.filter(i => i !== valor)));
        actualizarSelectsConfig();
    };

    function actualizarSelectsConfig() {
        const llenar = (id, tipo) => {
            const lista = JSON.parse(localStorage.getItem(`config_${tipo}`)) || [];
            const sel = document.getElementById(id);
            if(sel) sel.innerHTML = lista.map(i => `<option value="${i}">${i}</option>`).join('');
            const listUI = document.getElementById(`lista-config-${id === 'entrenador' ? 'dt' : 'lugar'}`);
            if(listUI) listUI.innerHTML = lista.map(i => `<li class="list-group-item d-flex justify-content-between p-1 align-items-center">${i}<button class="btn btn-sm btn-link text-danger p-0" onclick="eliminarOpcion('${tipo}', '${i}')">✕</button></li>`).join('');
        };
        llenar('entrenador', 'entrenadores');
        llenar('ubicacion', 'ubicaciones');
    }

    function actualizarSelectAnios(partidos) {
        const anios = [...new Set(partidos.map(p => p.fecha.split('-')[0]))].sort().reverse();
        const el = document.getElementById('filtro-anio');
        const actual = el.value;
        el.innerHTML = '<option value="todos">Todos los años</option>' + anios.map(a => `<option value="${a}">${a}</option>`).join('');
        el.value = actual || 'todos';
    }

    filtroAnio.addEventListener('change', cargarPartidos);
    window.toggleDetalle = (id) => document.getElementById(`detalle-${id}`).classList.toggle('d-none');
    window.eliminar = (id) => { if(confirm('¿Eliminar?')) { localStorage.setItem('partidosRiver', JSON.stringify(JSON.parse(localStorage.getItem('partidosRiver')).filter(p => p.id !== id))); cargarPartidos(); }};
});