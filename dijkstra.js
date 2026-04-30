const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let nodos = [];
let aristas = [];
let modo = "nodo";
let nodoSeleccionado = null;
let nodoHover = null;
let radio = 30;

let ultimoTipo = 'min';
let ultimoOrigen = null;
let ultimoDestino = null;

let nodoArrastrado = null;
let dragHasMoved = false;
let offsetLinea = 0;
let tiempoAnimacion = 0;

const COLOR_SOLUCION = "#e99897"; 
const COLOR_EVALUANDO = "#abcbd3"; 


function generarColor() {
    const colores = ["#c8c29e", "#e99897", "#abcbd3", "#ffc98d", "#e1d3b6", "#c0a290", "#ffb284", "#2a9d8f", "#ff9f1c"];
    return colores[Math.floor(Math.random() * colores.length)];
}

function oscurecerHex(hex, factor) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.floor(r * (1 - factor)));
    g = Math.max(0, Math.floor(g * (1 - factor)));
    b = Math.max(0, Math.floor(b * (1 - factor)));
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}


function animar() {
    offsetLinea -= 0.5;
    tiempoAnimacion += 0.08;
    nodos.forEach(n => {
        if (n.scale === undefined) n.scale = 1.0;
        let targetScale = (n === nodoSeleccionado || n === nodoHover) ? 1.15 : 1.0;
        n.scale += (targetScale - n.scale) * 0.2; 
    });
    dibujar();
    requestAnimationFrame(animar);
}
animar();

function dibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    aristas.forEach(a => dibujarArista(a));
    nodos.forEach(n => dibujarNodo(n));
}

function dibujarArista(arista) {
    const desde = arista.desde;
    const hasta = arista.hasta;
    let color = arista.enSolucion ? COLOR_SOLUCION : (arista.evaluando ? COLOR_EVALUANDO : (arista.color || "#999999"));
    let grosor = (arista.enSolucion || arista.evaluando) ? 6 : 2;

    ctx.save();
    if (arista.enSolucion || arista.evaluando) {
        ctx.setLineDash([10, 10]);
        ctx.lineDashOffset = offsetLinea;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
    } else {
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    }

    if (desde === hasta) {
        const loopRadius = 30, loopX = desde.x, loopY = desde.y - 50;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = grosor;
        ctx.arc(loopX, loopY, loopRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 3;
        ctx.strokeText(arista.peso, loopX, loopY - loopRadius - 10);
        ctx.fillStyle = oscurecerHex(color, 0.35);
        ctx.fillText(arista.peso, loopX, loopY - loopRadius - 10);

        if (arista.dirigida) dibujarFlecha(loopX + loopRadius, loopY, Math.PI / 2, color);
        ctx.restore();
        return;
    }

    let offset = 0;
    const existeInversa = aristas.some(a => a.desde === hasta && a.hasta === desde && a !== arista);
    if (existeInversa) offset = 40;

    const dx = hasta.x - desde.x, dy = hasta.y - desde.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const normX = dx / dist, normY = dy / dist;

    const startX = desde.x + normX * radio, startY = desde.y + normY * radio;
    const endX = hasta.x - normX * radio, endY = hasta.y - normY * radio;

    const controlX = (startX + endX) / 2 - normY * offset;
    const controlY = (startY + endY) / 2 + normX * offset;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    ctx.stroke();

    if (arista.dirigida) {
        const angle = Math.atan2(endY - controlY, endX - controlX);
        dibujarFlecha(endX, endY, angle, color);
    }

    ctx.shadowBlur = 0;
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 4;
    ctx.strokeText(arista.peso, controlX, controlY);
    ctx.fillStyle = oscurecerHex(color, 0.45);
    ctx.fillText(arista.peso, controlX, controlY);
    ctx.restore();
}

function dibujarFlecha(x, y, angle, color) {
    const size = 12;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

function dibujarNodo(n) {
    const esSeleccionado = (n === nodoSeleccionado || n === nodoHover);
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.scale(n.scale, n.scale);

    if (esSeleccionado) {
        ctx.shadowColor = "rgba(217, 130, 91, 0.6)"; 
        ctx.shadowBlur = 15;
        let grad = ctx.createRadialGradient(-5, -5, 5, 0, 0, radio);
        grad.addColorStop(0, "#e8a16c");
        grad.addColorStop(1, "#d9825b");
        ctx.fillStyle = grad;
        ctx.strokeStyle = "#b54c1f";
    } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#d9825b";
    }

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radio, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (n.distPantalla !== undefined && n.distPantalla !== Infinity && n.distPantalla !== -Infinity) {
        ctx.fillStyle = esSeleccionado ? "#ffffff" : "#d9825b";
        ctx.font = "bold 14px Arial";
        ctx.fillText(n.nombre, 0, -8);
        
        ctx.fillStyle = esSeleccionado ? "#ffe6d5" : "#666666";
        ctx.font = "bold 12px Arial";
        ctx.fillText(n.distPantalla, 0, 10);
    } else {
        ctx.fillStyle = esSeleccionado ? "#ffffff" : "#d9825b";
        ctx.font = "bold 15px Arial";
        ctx.fillText(n.nombre, 0, 0);
    }

    ctx.restore();
}


function obtenerNodo(x, y) {
    return nodos.find(n => Math.hypot(n.x - x, n.y - y) <= radio);
}

function obtenerArista(x, y) {
    for (let arista of aristas) {
        if (arista.desde === arista.hasta) {
            const loopX = arista.desde.x, loopY = arista.desde.y - 50;
            if (Math.abs(Math.hypot(x - loopX, y - loopY) - 30) < 15) return arista;
            continue;
        }

        let offset = 0;
        if (aristas.some(a => a.desde === arista.hasta && a.hasta === arista.desde && a !== arista)) offset = 40;

        const dx = arista.hasta.x - arista.desde.x, dy = arista.hasta.y - arista.desde.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normX = dx / dist, normY = dy / dist;

        const startX = arista.desde.x + normX * radio, startY = arista.desde.y + normY * radio;
        const endX = arista.hasta.x - normX * radio, endY = arista.hasta.y - normY * radio;
        const controlX = (startX + endX) / 2 - normY * offset;
        const controlY = (startY + endY) / 2 + normX * offset;

        for (let t = 0; t <= 1; t += 0.05) {
            const px = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
            const py = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
            if (Math.hypot(x - px, y - py) < 15) return arista;
        }
    }
    return null;
}


canvas.onmousedown = (e) => {
    const x = e.offsetX, y = e.offsetY;
    if (modo === "editar") {
        nodoArrastrado = obtenerNodo(x, y);
        dragHasMoved = false;
    }
};

canvas.onmousemove = (e) => {
    const x = e.offsetX, y = e.offsetY;
    if (nodoArrastrado) {
        nodoArrastrado.x = x;
        nodoArrastrado.y = y;
        dragHasMoved = true;
    }
    nodoHover = obtenerNodo(x, y);
};

canvas.onmouseup = () => nodoArrastrado = null;

canvas.onclick = (e) => {
    if (dragHasMoved) return;
    const x = e.offsetX, y = e.offsetY;
    const nodo = obtenerNodo(x, y);
    const arista = obtenerArista(x, y);

    if (modo !== "editar" || nodo || arista) limpiarResultados();

    if (modo === "nodo" && !nodo) {
        abrirModal("Nombre del Nodo", (val) => {
            if (val) nodos.push({ x, y, nombre: val, id: Date.now(), scale: 1.0 });
        }, "text", true);
    } else if (modo === "arista" && nodo) {
        if (!nodoSeleccionado) nodoSeleccionado = nodo;
        else if (nodoSeleccionado !== nodo) {
            const yaExiste = aristas.some(a => a.desde === nodoSeleccionado && a.hasta === nodo);
            if (yaExiste) { nodoSeleccionado = null; return; }
            
            abrirModal("Peso de la Arista", (val) => {
                let p = parseFloat(val);
                if (!isNaN(p)) aristas.push({ desde: nodoSeleccionado, hasta: nodo, peso: p, dirigida: true, enSolucion: false, evaluando: false, color: generarColor() });
                nodoSeleccionado = null;
            }, "number", true);
        } else {
            nodoSeleccionado = null; 
        }
    } else if (modo === "editar") {
        if (nodo) abrirModal("Editar Nombre", (v) => { if (v) nodo.nombre = v; }, "text", true);
        else if (arista) abrirModal("Editar Peso", (v) => { let p = parseFloat(v); if (!isNaN(p)) arista.peso = p; }, "number", true);
    } else if (modo === "borrar") {
        if (nodo) {
            nodos = nodos.filter(n => n !== nodo);
            aristas = aristas.filter(a => a.desde !== nodo && a.hasta !== nodo);
        } else if (arista) aristas = aristas.filter(a => a !== arista);
    }
};

function limpiarResultados() {
    nodos.forEach(n => { 
        n.distMatematica = undefined; 
        n.distPantalla = undefined; 
        n.prev = null; 
        n.visitado = false; 
    });
    aristas.forEach(a => { a.enSolucion = false; a.evaluando = false; });
    document.getElementById("btn-explicar").disabled = true;
}


const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function abrirModalDijkstra(tipo) {
    if (nodos.length < 2) return;
    ultimoTipo = tipo;
    document.getElementById("dijkstra-origen").value = "";
    document.getElementById("dijkstra-destino").value = "";
    document.getElementById("modal-error-dijkstra").textContent = "";
    document.getElementById("modal-dijkstra").classList.add("active");
}

function cerrarModalDijkstra() {
    document.getElementById("modal-dijkstra").classList.remove("active");
}

async function confirmarDijkstra() {
    const nomOrig = document.getElementById("dijkstra-origen").value.trim();
    const nomDest = document.getElementById("dijkstra-destino").value.trim();
    const errEl = document.getElementById("modal-error-dijkstra");

    if (!nomOrig || !nomDest) { errEl.textContent = "Llena ambos campos."; return; }

    let origen = nodos.find(n => n.nombre.toLowerCase() === nomOrig.toLowerCase());
    let destino = nodos.find(n => n.nombre.toLowerCase() === nomDest.toLowerCase());

    if (!origen || !destino) { errEl.textContent = "Nodos no encontrados en el grafo."; return; }

    cerrarModalDijkstra();
    await procesarDijkstra(origen, destino, ultimoTipo, false);
}

async function procesarDijkstra(origen, destino, tipo, animar) {
    ultimoOrigen = origen;
    ultimoDestino = destino;
    limpiarResultados();
    

    nodos.forEach(n => { n.distMatematica = Infinity; });
    
    origen.distMatematica = 0;
    origen.distPantalla = 0;
    let unvisited = [...nodos];

    while(unvisited.length > 0) {

        unvisited.sort((a, b) => a.distMatematica - b.distMatematica);
        let u = unvisited.shift();

        if (u.distMatematica === Infinity) break;
        

        u.visitado = true;

        
        if (tipo === 'min' && u === destino) break; 

        let aristasVecinas = aristas.filter(a => a.desde === u);

        for (let a of aristasVecinas) {
            let v = a.hasta;

            
            if (v.visitado) continue;

            if (animar) { a.evaluando = true; await sleep(800); }

            let pesoInterno = tipo === 'max' ? -a.peso : a.peso;
            let alt = u.distMatematica + pesoInterno;

            if (alt < v.distMatematica) {
                v.distMatematica = alt;
                v.distPantalla = tipo === 'max' ? -alt : alt; 
                v.prev = { nodo: u, arista: a };
            }

            if (animar) { a.evaluando = false; await sleep(200); }
        }
    }


    let pathPeso = 0;
    let curr = destino;
    let rutaValida = true;
    let contadorSeguridad = 0;

    while(curr && curr.prev) {
        contadorSeguridad++;

        if(contadorSeguridad > nodos.length) {
            rutaValida = false; 
            break; 
        }
        curr.prev.arista.enSolucion = true;
        pathPeso += curr.prev.arista.peso;
        curr = curr.prev.nodo;
        if (animar) await sleep(300);
    }

    document.getElementById("btn-explicar").disabled = false;

    if (animar) {
        abrirModal(`Dijkstra (${tipo === 'min' ? 'Mín' : 'Máx'}) Finalizado`, null, "text", false);
        const errEl = document.getElementById("modal-error");
        
        if (destino.distPantalla === undefined || !rutaValida) {
            errEl.textContent = "No existe una ruta directa válida.";
        } else {
            errEl.textContent = "Distancia Total: " + pathPeso; 
            errEl.style.color = COLOR_SOLUCION; 
        }
        errEl.style.display = "block";
    }
}

function prepararExplicacion() { 
    if (ultimoOrigen && ultimoDestino) procesarDijkstra(ultimoOrigen, ultimoDestino, ultimoTipo, true); 
}

// --- EXPORTAR / IMPORTAR ---
function exportarGrafo() {
    abrirModal("Nombre del archivo", (nombre) => {
        if (!nombre) return;
        
        // EXPORTACIÓN LIMPIA: Solo guardamos la estructura base, sin las respuestas de Dijkstra
        const grafoBase = {
            nodos: nodos.map(n => ({ 
                id: n.id, 
                x: n.x, 
                y: n.y, 
                nombre: n.nombre 
            })),
            aristas: aristas.map(a => ({ 
                desdeId: a.desde.id, 
                hastaId: a.hasta.id, 
                peso: a.peso, 
                dirigida: a.dirigida, 
                color: a.color 
            }))
        };

        const data = JSON.stringify(grafoBase);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
        link.download = nombre + ".json"; 
        link.click();
    }, "text", true);
}

function importarGrafo(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            ultimoOrigen = null;
            ultimoDestino = null;
            document.getElementById("btn-explicar").disabled = true;
            nodos = data.nodos.map(n => ({ 
                id: n.id, 
                x: n.x, 
                y: n.y, 
                nombre: n.nombre, 
                scale: 1.0 
            })); 
        
            aristas = data.aristas.map(a => ({
                desde: nodos.find(n => n.id === a.desdeId),
                hasta: nodos.find(n => n.id === a.hastaId),
                peso: a.peso, 
                dirigida: a.dirigida !== undefined ? a.dirigida : true, 
                color: a.color || generarColor(),
                enSolucion: false, 
                evaluando: false
            }));
            
            dibujar();
            
        } catch (error) {
            alert("Error al cargar el grafo. Verifica que el archivo JSON sea válido.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

let modalCb = null;
function abrirModal(tit, cb, tipo = "text", mostrarInput = true) {
    document.getElementById("modal-title").textContent = tit;
    const input = document.getElementById("modal-input");
    const errEl = document.getElementById("modal-error");
    const btnAceptar = document.querySelector("#modal .aceptar");

    input.value = ""; input.type = tipo; errEl.textContent = ""; errEl.style.color = ""; errEl.style.display = "none";
    input.style.display = mostrarInput ? "block" : "none";

    document.getElementById("modal").classList.add("active");
    modalCb = cb;
    if (mostrarInput) input.focus();
}

function cerrarModal() { document.getElementById("modal").classList.remove("active"); }

function confirmarModal() {
    const input = document.getElementById("modal-input");
    if (input.style.display === "none") { cerrarModal(); return; }
    const val = input.value.trim();
    if (val === "") {
        const errEl = document.getElementById("modal-error");
        errEl.textContent = "El campo no puede estar vacío."; errEl.style.display = "block";
        return;
    }
    if (modalCb) modalCb(val);
    cerrarModal();
}

function abrirHelp() { document.getElementById("help-modal").classList.add("active"); }
function cerrarHelp() { document.getElementById("help-modal").classList.remove("active"); }
function cambiarModo(m, b) {
    modo = m; nodoSeleccionado = null;
    document.querySelectorAll(".modo-btn").forEach(btn => btn.classList.remove("activo"));
    b.classList.add("activo");
}
function limpiarGrafo() { nodos = []; aristas = []; document.getElementById("btn-explicar").disabled = true; }