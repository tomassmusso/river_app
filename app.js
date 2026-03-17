document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-partido');
    const tablaBody = document.getElementById('tabla-body');
    const filtroAnio = document.getElementById('filtro-anio');
    const contenedorGoleadores = document.getElementById('contenedor-goleadores');

    // --- INICIALIZACIÓN ---
    const configs = {
        'config_competiciones': ['Liga Profesional', 'Copa Libertadores', 'Copa Argentina', 'Amistoso'],
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

    // --- GUARDAR ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const listaGoleadores = [];
        document.querySelectorAll('.goleador-input').forEach(row => {
            const n = row.querySelector('.gol-nombre').value.trim();
            const c = parseInt(row.querySelector('.gol-cantidad').value);
            if (n) listaGoleadores.push({ nombre: n, cantidad: c });
        });

        const nuevoPartido = {
            id: Date.now(),
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

        const partidos = JSON.parse(localStorage.getItem('partidosRiver')) || [];
        partidos.push(nuevoPartido);
        localStorage.setItem('partidosRiver', JSON.stringify(partidos));

        form.reset();
        contenedorGoleadores.innerHTML = '';
        bootstrap.Modal.getInstance(document.getElementById('modalPartido')).hide();
        cargarPartidos();
    });

    // --- TABLA PRINCIPAL ---
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
                <td class="text-end"><button class="btn btn-link text-danger p-0" onclick="eliminar(${p.id})">🗑️</button></td>
            `;
            const trDetalle = document.createElement('tr');
            trDetalle.id = `detalle-${p.id}`;
            trDetalle.className = 'd-none';
            trDetalle.innerHTML = `
                <td colspan="6" class="nota-expandida p-3">
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

    // --- ESTADÍSTICAS ---
    window.generarEstadisticas = () => {
        const partidos = JSON.parse(localStorage.getItem('partidosRiver')) || [];
        let v = 0, e = 0, d = 0;
        
        const golesMap = {};
        const rivalesMap = {};
        const lugaresMap = {};
        const dtsMap = {};

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
        const porcVic = total > 0 ? Math.round((v / total) * 100) : 0;

        let colorPorcentaje = 'text-warning'; 
        if (v > d) colorPorcentaje = 'text-success'; 
        if (d > v) colorPorcentaje = 'text-danger';  

        // Render Rendimiento
        document.getElementById('tab-rendimiento').innerHTML = `
            <div class="py-3">
                <div class="stats-total-card shadow-sm mb-4">
                    <span class="text-muted small text-uppercase d-block">Partidos Totales</span>
                    <span class="h2 fw-bold mb-0">${total}</span>
                </div>
                <div class="mb-4">
                    <span class="text-muted small text-uppercase fw-bold d-block mb-1">Efectividad de Victorias</span>
                    <h2 class="display-4 fw-bolder ${colorPorcentaje} mb-0">${porcVic}%</h2>
                </div>
                <div class="d-flex justify-content-around pt-3 border-top">
                    <div class="text-center">
                        <div class="h5 mb-0 text-secondary">${v}</div>
                        <div class="text-muted small">Ganados</div>
                    </div>
                    <div class="text-center px-4">
                        <div class="h5 mb-0 text-secondary">${e}</div>
                        <div class="text-muted small">Empatados</div>
                    </div>
                    <div class="text-center">
                        <div class="h5 mb-0 text-secondary">${d}</div>
                        <div class="text-muted small">Perdidos</div>
                    </div>
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
            comp: JSON.parse(localStorage.getItem('config_competiciones')),
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
                localStorage.setItem('config_competiciones', JSON.stringify(d.comp || []));
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
            const listUI = document.getElementById(`lista-config-${id === 'competicion' ? 'comp' : (id === 'entrenador' ? 'dt' : 'lugar')}`);
            if(listUI) listUI.innerHTML = lista.map(i => `<li class="list-group-item d-flex justify-content-between p-1 align-items-center">${i}<button class="btn btn-sm btn-link text-danger p-0" onclick="eliminarOpcion('${tipo}', '${i}')">✕</button></li>`).join('');
        };
        llenar('competicion', 'competiciones');
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