// ASTELL HOME — Painel administrativo (página separada: admin.html).
// Usa o mesmo banco Supabase do app do cliente: o que é cadastrado aqui aparece lá, conforme o CPF vinculado.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => d ? new Date(String(d).slice(0, 10) + 'T00:00').toLocaleDateString('pt-BR') : '—';
const clean = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]));
function toast(m, err) { const t = $('#toast'); t.textContent = m; t.className = 'show' + (err ? ' err' : ''); setTimeout(() => t.className = '', 3500); }

let sb; try { sb = supabase.createClient(new URL(SUPABASE_URL.trim()).origin, SUPABASE_KEY.trim()); } catch (e) { sb = null; }
const view = $('#view');
const fail = m => { view.innerHTML = '<div class="card" style="margin:16px"><b>Não foi possível iniciar o painel</b><p class="mute">' + m + '</p></div>'; };
if (!sb || /COLE_AQUI/.test(SUPABASE_URL + SUPABASE_KEY)) { fail('Abra o arquivo config.js e preencha SUPABASE_URL e SUPABASE_KEY.'); throw new Error('Supabase não configurado'); }
addEventListener('error', e => { if (!view.innerHTML.trim()) fail('Erro: ' + e.message); });

const S = { profile: null, res: [], cur: null, rows: {}, hf: {}, place: false, mTab: 'all', sel: { on: false, ids: new Set() }, q: '', arg: null, ownersByRes: {}, pp: 10, pages: {}, noun: null, stack: [], items: null, empties: {}, lastMenu: null, owners: [], links: [], curPlan: null };
// Aceita CLOUDINARY_UPLOAD_PRESET ou CLOUDINARY_PRESET no config.js
const CLD_NAME = typeof CLOUDINARY_CLOUD_NAME !== 'undefined' ? String(CLOUDINARY_CLOUD_NAME).trim() : '';
const CLD_PRESET = typeof CLOUDINARY_UPLOAD_PRESET !== 'undefined' ? String(CLOUDINARY_UPLOAD_PRESET).trim() : (typeof CLOUDINARY_PRESET !== 'undefined' ? String(CLOUDINARY_PRESET).trim() : '');
const CLOUD_OK = !!(CLD_NAME && CLD_PRESET) && !/COLE_AQUI/.test(CLD_NAME + CLD_PRESET);
const isVid = x => x.media_type === 'video';
const vsrc = u => String(u).replace('/upload/', '/upload/f_mp4,vc_h264,q_auto/').replace(/\.\w+$/, '.mp4');
const vposter = u => String(u).replace('/upload/', '/upload/w_480,c_limit,so_0/').replace(/\.\w+$/, '.jpg');
const cld = (u, w) => String(u).replace('/upload/', `/upload/w_${w},c_limit,q_auto,f_auto/`);
const thumbsOf = a => a && a.length ? `<div class="thumbs">${a.slice(0, 6).map(x => `<img src="${esc(cld(x.url, 240))}" alt="" loading="lazy">`).join('')}</div>` : '';

// ---------- ícones
const ico = d => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.split('|').map(p => `<path d="${p}"/>`).join('')}</svg>`;
const IC = { casa: 'M4 21V8l8-5 8 5v13|M9 21v-6h6v6', user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M8 13h8|M8 17h8', layers: 'M12 2L2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5', shield: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z|M9 12l2 2 4-4', wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z', phones: 'M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3', clock: 'M12 6v6l4 2|M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10', book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20|M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z', grid: 'M3 3h7v7H3z|M14 3h7v7h-7z|M14 14h7v7h-7z|M3 14h7v7H3z', map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z|M9 3v15|M15 6v15' };
const GOOGLE_SVG = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

// ---------- menus (o primeiro é a tela inicial)
const MENU = [['res', 'Residências', 'casa'], ['own', 'Proprietários', 'user'], ['docs', 'Documentos', 'doc'], ['eq', 'Equipamentos', 'layers'], ['gar', 'Garantias', 'shield'], ['man', 'Manutenções', 'wrench'], ['ast', 'Assistência', 'phones'], ['his', 'Histórico', 'clock'], ['ctt', 'Contatos', 'book'], ['bld', 'Construção', 'home'], ['qr', 'QR Codes', 'grid'], ['pl', 'Planta técnica', 'map']];
const TABLE_OF = { eq: 'equipment', gar: 'warranties', man: 'maintenance_tasks', ctt: 'contacts', bld: 'building_items' };

// ---------- dados e campos
const addMonths = (d, m) => { const x = new Date(d + 'T00:00'); x.setMonth(x.getMonth() + m); return x; };
function wState(w) { const end = addMonths(w.start_date, w.months), days = (end - new Date()) / 864e5; return days < 0 ? ['Encerrada', 'bad', end] : days < 90 ? ['Próxima do vencimento', 'warn', end] : ['Vigente', 'ok', end]; }
const DOC_CATS = ['Projeto arquitetônico', 'Projeto estrutural', 'Projeto elétrico', 'Projeto hidráulico', 'Projeto sanitário', 'Climatização', 'Cobertura', 'Memorial descritivo', 'Manuais', 'Notas e comprovantes', 'Termo de entrega', 'Garantia', 'Outros'];
const STATUS = ['Recebida', 'Em análise', 'Aguardando informações', 'Agendada', 'Em atendimento', 'Concluída', 'Encerrada'];
const PT_CATS = ['Elétrica', 'Hidráulica', 'Gás', 'Climatização', 'Estrutura', 'Paredes', 'Equipamentos'];
const QR_T = { 'Minha casa': 'casa', 'Documentos e manuais': 'documentos', 'Equipamentos': 'equipamentos', 'Manutenção': 'manutencao', 'Planta técnica': 'planta', 'Assistência técnica': 'assistencia' };
const TBL = { residences: 'Residência', documents: 'Documento', warranties: 'Garantia', maintenance_tasks: 'Manutenção', equipment: 'Equipamento', history_events: 'Evento do histórico', contacts: 'Contato', building_items: 'Item construtivo', images: 'Imagem', floorplans: 'Planta', plan_points: 'Ponto da planta', qr_codes: 'QR Code', service_requests: 'Assistência' };
const ACT = { INSERT: 'criou', UPDATE: 'alterou', DELETE: 'excluiu' };

const DEFREQ = ['system', 'name', 'description', 'months', 'start_date', 'event_date', 'title'];
const fld = ([k, l, t = 'text', req], v = {}) => {
  const val = v[k] ?? '', r = (req ?? DEFREQ.includes(k)) ? 'required' : '';
  if (t === 'date') return dateField(k, l, val, r === 'required');
  if (Array.isArray(t)) return `<label>${l}<select name="${k}">${t.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  return `<label>${l}${t === 'textarea' ? `<textarea name="${k}" rows="3" ${r}>${esc(val)}</textarea>` : `<input name="${k}" type="${t}" value="${esc(val)}" ${r}>`}</label>`;
};
const RES_F = [['code', 'Código (ex.: AST-2026-002)', 'text', true], ['name', 'Nome da residência', 'text', true], ['address', 'Endereço'], ['area_m2', 'Área construída (m²)', 'number'], ['floors', 'Pavimentos', 'number'], ['build_system', 'Sistema construtivo'], ['project_no', 'Nº do projeto'], ['start_date', 'Início da obra', 'date', false], ['delivery_date', 'Entrega', 'date', false], ['tech_lead', 'Responsável técnico'], ['notes', 'Observações', 'textarea']];
const DOC_F = [['title', 'Título'], ['category', 'Categoria', DOC_CATS], ['version', 'Versão'], ['description', 'Descrição', 'text', false]];
const T = {
  warranties: { label: 'Garantias', order: 'start_date', f: [['system', 'Sistema ou componente'], ['coverage', 'Descrição da cobertura'], ['start_date', 'Data inicial', 'date'], ['months', 'Prazo (meses)', 'number'], ['notes', 'Condições e exclusões', 'textarea']],
    row: r => { const [s, c, end] = wState(r); return `<b>${esc(r.system)}</b> <span class="badge ${c}">${s}</span><p>${esc(r.coverage)}</p><span class="mute">${fmt(r.start_date)} até ${end.toLocaleDateString('pt-BR')}</span><p class="mute">${esc(r.notes)}</p>`; },
    note: 'Os prazos valem conforme contrato, fabricante e lei. As condições contratuais e legais prevalecem sobre os indicadores do aplicativo.' },
  maintenance_tasks: { label: 'Manutenções', order: 'next_due', f: [['name', 'Tarefa'], ['system', 'Sistema'], ['frequency', 'Periodicidade (texto)'], ['last_done', 'Última execução', 'date'], ['next_due', 'Próxima data', 'date'], ['interval_months', 'Repetir a cada (meses)', 'number'], ['status', 'Situação', ['Pendente', 'Em andamento', 'Concluída', 'Cancelada']], ['instructions', 'Instruções', 'textarea']],
    row: r => { const st = r.status || 'Pendente', late = r.next_due && new Date(r.next_due + 'T00:00') < new Date() && !['Concluída', 'Cancelada'].includes(st); return `<b>${esc(r.name)}</b> <span class="badge ${late ? 'bad' : st === 'Concluída' ? 'ok' : ''}">${late ? 'Atrasada' : st}</span><p class="mute">${esc(r.system)} · ${esc(r.frequency)}</p>Última: ${fmt(r.last_done)} · Próxima: ${fmt(r.next_due)}<p class="mute">${esc(r.instructions)}</p>`; } },
  equipment: { label: 'Equipamentos', f: [['name', 'Nome'], ['category', 'Categoria'], ['maker', 'Fabricante'], ['model', 'Modelo'], ['serial', 'Nº de série'], ['location', 'Localização']],
    row: r => `<b>${esc(r.name)}</b><span class="mute">${esc(r.category)} · ${esc(r.location)}</span><p>${esc(r.maker)} ${esc(r.model)} ${r.serial ? '· Série ' + esc(r.serial) : ''}</p>` },
  history_events: { label: 'Histórico', f: [['event_date', 'Data', 'date'], ['category', 'Categoria'], ['description', 'Descrição', 'textarea']], row: () => '' },
  contacts: { label: 'Contatos', f: [['name', 'Nome / empresa'], ['specialty', 'Especialidade'], ['phone', 'Telefone'], ['whatsapp', 'WhatsApp'], ['email', 'E-mail'], ['hours', 'Horário de atendimento'], ['notes', 'Instruções', 'textarea']],
    row: r => `<b>${esc(r.name)}</b><span class="mute">${esc(r.specialty)}</span><p>${esc(r.phone)} ${esc(r.whatsapp)} ${esc(r.email)}</p><span class="mute">${esc(r.hours)} ${esc(r.notes)}</span>` },
  building_items: { label: 'Construção', f: [['category', 'Seção do app', ['Estrutura', 'Sistemas', 'Materiais']], ['title', 'Título'], ['description', 'Descrição', 'textarea', false], ['highlights', 'Destaques (um por linha)', 'textarea']],
    row: r => `<b>${esc(r.title)}</b> <span class="badge">${esc(r.category)}</span><p class="mute">${esc(r.description)}</p><p>${esc((r.highlights || '').split('\n').filter(Boolean).join(' · '))}</p>` },
};
const fieldsFor = k => k === 'res' ? RES_F : k === 'documents' ? DOC_F : T[k].f;

// CPF
function cpfDigits(v) { return String(v || '').replace(/\D/g, '').slice(0, 11); }
function cpfMask(v) { return cpfDigits(v).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2'); }
function cpfOk(d) { if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false; for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += d[i] * (t + 1 - i); if ((s * 10) % 11 % 10 != d[t]) return false; } return true; }

// telefone (celular/WhatsApp): máscara (00) 00000-0000
function telDigits(v) { return String(v || '').replace(/\D/g, '').slice(0, 11); }
function telMask(v) { const d = telDigits(v); if (!d) return ''; if (d.length <= 2) return '(' + d; if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`; if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; }
const PP = [10, 25, 50];
try { const v = +localStorage.getItem('astell_pp'); if (PP.includes(v)) S.pp = v; } catch (e) { /* sem armazenamento: usa 10 */ }
const telOk = v => !v || [10, 11].includes(telDigits(v).length);


// ---------- janela de formulário (com pilha: o botão "Cadastrar" abre outra janela por cima e, ao terminar, volta ao formulário de origem com tudo preenchido)
function modal(title, body, attrs, btn = 'Salvar') {
  $('#modal').innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheethead"><b>${esc(title)}</b><button type="button" class="x" data-close aria-label="Fechar">×</button></div><form ${attrs}>${body}<button>${btn}</button><button type="button" class="ghost2" data-close>Cancelar</button></form></div>`;
  $('#modal').hidden = false; document.querySelectorAll('#modal .ownpick').forEach(refreshOwnPick); document.querySelectorAll('#modal .resmulti').forEach(refreshResMulti); initCombos();
}
const hardClose = () => { S.stack = []; $('#modal').hidden = true; $('#modal').innerHTML = ''; };
function pushModal(after) { const sheet = $('#modal').firstElementChild; if (sheet) $('#modal').removeChild(sheet); S.stack.push({ sheet, after }); }
function popModal(result) { const f = S.stack.pop(); $('#modal').innerHTML = ''; if (f && f.sheet) $('#modal').appendChild(f.sheet); $('#modal').hidden = false; if (f && f.after && result) f.after(result); }
const closeModal = () => S.stack.length ? popModal(null) : hardClose();

// escolha obrigatória de residência (com botão Cadastrar ao lado)
const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR');
const resSelect = () => `<div class="field combo" data-combo="res"><span class="lbl">Residência *</span><div class="selrow"><div class="comboin"><input class="comboq" type="search" placeholder="Pesquisar residência pelo nome…" autocomplete="off" required role="combobox" aria-expanded="false" aria-label="Pesquisar residência"><input type="hidden" name="residence_id"><ul class="combolist" role="listbox" hidden></ul></div><button type="button" data-newres>Cadastrar</button></div><p class="mute combohint">Digite parte do nome e escolha a residência na lista.</p>${S.res.length ? '' : '<p class="mute">Nenhuma residência cadastrada ainda. Use “Cadastrar” para criar a primeira.</p>'}</div>`;
const ownPickHtml = ids => `<div class="ownpick field combo" data-combo="own"><span class="lbl">Proprietários vinculados (opcional)</span><div class="selrow"><div class="comboin"><input class="comboq" type="search" placeholder="Pesquisar proprietário pelo nome…" autocomplete="off" role="combobox" aria-expanded="false" aria-label="Pesquisar proprietário"><ul class="combolist" role="listbox" hidden></ul></div><button type="button" data-newown>Cadastrar</button></div><div class="reslinked" data-ownlist></div><input type="hidden" name="owner_ids" value="${ids.join(',')}"></div>`;
function refreshOwnPick(box) {   // lista numerada dos proprietários escolhidos (a gravação acontece ao salvar a residência)
  const ids = box.querySelector('[name=owner_ids]').value.split(',').filter(Boolean), os = ids.map(id => S.owners.find(x => x.id === id)).filter(Boolean);
  box.querySelector('[data-ownlist]').innerHTML = os.length ? `<h4 class="reshead">Proprietários vinculados (${os.length})</h4><ol class="reslist">${os.map(o => `<li><div class="rname"><b>${esc(o.name)}</b><span class="mute">${esc(o.cpf_mask)}</span></div>${acts(`<button type="button" class="link" data-ownedit="${o.id}">Editar</button>`, `<button type="button" class="link danger" data-ownunlink="${o.id}">Desvincular</button>`)}</li>`).join('')}</ol>` : '<p class="mute reshead">Nenhum proprietário vinculado.</p>';
}
// lista de resultados da pesquisa: só o NOME da residência (ou do proprietário) é considerado
function comboList(box) {
  const type = box.dataset.combo, inp = box.querySelector('.comboq'), ul = box.querySelector('.combolist'); let q = norm(inp.value).trim(), items;
  if (!q) return comboClose(box);   // sem caracteres digitados: nenhuma sugestão
  if (type === 'res') {
    const cur = S.res.find(r => r.id === box.querySelector('[name=residence_id]').value); if (cur && cur.name === inp.value) return comboClose(box);   // já escolhida: nada a sugerir
    items = S.res.filter(r => !q || norm(r.name).includes(q)).sort(byName).map(r => ({ id: r.id, label: r.name, sub: r.code }));
  } else if (type === 'resmulti') {   // residências do proprietário: não repete as que já estão na lista
    const ids = box.querySelector('[name=res_ids]').value.split(',').filter(Boolean);
    items = S.res.filter(r => !ids.includes(r.id) && (!q || norm(r.name).includes(q))).sort(byName).map(r => ({ id: r.id, label: r.name, sub: r.code }));
  } else {
    const ids = box.querySelector('[name=owner_ids]').value.split(',').filter(Boolean);
    items = S.owners.filter(o => !ids.includes(o.id) && (!q || norm(o.name).includes(q))).sort(byName).map(o => ({ id: o.id, label: o.name, sub: o.cpf_mask }));
  }
  if (!items.length) return comboClose(box);   // nenhuma opção contém o que foi digitado: a caixa não aparece
  ul.innerHTML = items.map((it, i) => `<li role="option" data-opt="${it.id}" class="${i ? '' : 'on'}">${type === 'resmulti' || type === 'own' ? `<span class="lname"><b>${esc(it.label)}</b><span class="mute">${esc(it.sub)}</span></span><button type="button" data-addopt="${it.id}">Adicionar</button>` : `<b>${esc(it.label)}</b><span class="mute">${esc(it.sub)}</span>`}</li>`).join('');
  ul.hidden = false; inp.setAttribute('aria-expanded', 'true');
}
function comboClose(box) { const ul = box.querySelector('.combolist'); ul.hidden = true; ul.innerHTML = ''; box.querySelector('.comboq').setAttribute('aria-expanded', 'false'); }
function comboPick(box, id) {
  const inp = box.querySelector('.comboq');
  if (box.dataset.combo === 'resmulti') { const h = box.querySelector('[name=res_ids]'); h.value = [...h.value.split(',').filter(Boolean), id].join(','); inp.value = ''; refreshResMulti(box); comboClose(box); return; }
  if (box.dataset.combo === 'res') { const r = S.res.find(x => x.id === id); if (!r) return; box.querySelector('[name=residence_id]').value = id; inp.value = r.name; inp.setCustomValidity(''); }
  else { const h = box.querySelector('[name=owner_ids]'); h.value = [...h.value.split(',').filter(Boolean), id].join(','); inp.value = ''; refreshOwnPick(box); }
  comboClose(box);
}
// lista numerada das residências vinculadas ao proprietário (a gravação acontece ao clicar em Salvar)
const resMultiHtml = ids => `<div class="resmulti field combo" data-combo="resmulti"><span class="lbl">Residências vinculadas (opcional)</span><div class="selrow"><div class="comboin"><input class="comboq" type="search" placeholder="Pesquisar residência pelo nome…" autocomplete="off" role="combobox" aria-expanded="false" aria-label="Pesquisar residência"><ul class="combolist" role="listbox" hidden></ul></div><button type="button" data-newres>Cadastrar</button></div><input type="hidden" name="res_ids" value="${ids.join(',')}"><div class="reslinked" data-reslist></div></div>`;
function refreshResMulti(box) {
  const ids = box.querySelector('[name=res_ids]').value.split(',').filter(Boolean), rs = ids.map(id => S.res.find(r => r.id === id)).filter(Boolean);
  box.querySelector('[data-reslist]').innerHTML = rs.length ? `<h4 class="reshead">Residências vinculadas (${rs.length})</h4><ol class="reslist">${rs.map(r => `<li><div class="rname"><b>${esc(r.name)}</b><span class="mute">${esc(r.code)}${r.address ? ' · ' + esc(r.address) : ''}</span></div>${acts(`<button type="button" class="link" data-reedit="${r.id}">Editar</button>`, `<button type="button" class="link danger" data-reunlink="${r.id}">Desvincular</button>`)}</li>`).join('')}</ol>` : '<p class="mute reshead">Nenhuma residência vinculada.</p>';
}
const initCombos = () => document.querySelectorAll('#modal .combo[data-combo=res] .comboq').forEach(q => q.setCustomValidity('Escolha uma residência da lista.'));

// calendário amarelo (o do navegador não aceita cor): digitar dd/mm/aaaa ou abrir o calendário
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const isoOf = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const brOf = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
function parseBr(t) { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t || ''); if (!m) return null; const d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1] ? `${m[3]}-${m[2]}-${m[1]}` : null; }
const CAL_SVG = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
const dateField = (name, label, iso = '', req = false) => `<div class="field"><span class="lbl">${label}${req ? ' *' : ''}</span><div class="dateinp" data-date><input class="datetxt" type="text" inputmode="numeric" placeholder="dd/mm/aaaa" maxlength="10" autocomplete="off" value="${esc(brOf(iso))}" aria-label="${esc(label)}" ${req ? 'required' : ''}><button type="button" class="calbtn" data-cal aria-label="Abrir calendário — ${esc(label)}">${CAL_SVG}</button><input type="hidden" name="${name}" value="${esc(iso || '')}"><div class="calpop" hidden></div></div></div>`;
function calSet(box, iso) { box.querySelector('[type=hidden]').value = iso || ''; const t = box.querySelector('.datetxt'); t.value = brOf(iso); t.setCustomValidity(''); }
function calRender(box, y, m) {
  const pop = box.querySelector('.calpop'), sel = box.querySelector('[type=hidden]').value, n = new Date(), hoje = isoOf(n.getFullYear(), n.getMonth(), n.getDate());
  const ini = new Date(y, m, 1).getDay(), dias = new Date(y, m + 1, 0).getDate(); let cells = '<span></span>'.repeat(ini);
  for (let d = 1; d <= dias; d++) { const iso = isoOf(y, m, d); cells += `<button type="button" class="day${iso === sel ? ' sel' : ''}${iso === hoje ? ' today' : ''}" data-day="${iso}" aria-label="${d} de ${MESES[m]} de ${y}">${d}</button>`; }
  pop.dataset.y = y; pop.dataset.m = m;
  pop.innerHTML = `<div class="calhead"><button type="button" data-calnav="-12" aria-label="Ano anterior">«</button><button type="button" data-calnav="-1" aria-label="Mês anterior">‹</button><b>${MESES[m]} ${y}</b><button type="button" data-calnav="1" aria-label="Próximo mês">›</button><button type="button" data-calnav="12" aria-label="Próximo ano">»</button></div><div class="calgrid">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(x => `<i>${x}</i>`).join('')}${cells}</div><div class="calfoot"><button type="button" data-caltoday>Hoje</button><button type="button" data-calclear>Limpar</button></div>`;
}
function calOpen(box) { closeFloating(box); const v = box.querySelector('[type=hidden]').value, d = v ? new Date(v + 'T00:00') : new Date(); calRender(box, d.getFullYear(), d.getMonth()); box.querySelector('.calpop').hidden = false; }
// fecha calendários e listas de pesquisa abertos (menos o que contém `except`); devolve se fechou algo
function closeFloating(except) {
  let any = false;
  document.querySelectorAll('.calpop:not([hidden])').forEach(p => { if (!except || !p.closest('[data-date]').contains(except)) { p.hidden = true; any = true; } });
  document.querySelectorAll('.combolist:not([hidden])').forEach(u => { const b = u.closest('.combo'); if (!except || !b.contains(except)) { comboClose(b); any = true; } });
  return any;
}
const resFormBody = (row = {}, ownerIds = [], noOwners = false) => RES_F.map(f => fld(f, row)).join('') + (noOwners ? '' : ownPickHtml(ownerIds));

const ADD = {
  res: noOwners => modal('Nova residência', resFormBody({}, [], noOwners) + (noOwners ? '<p class="mute">Ao salvar o proprietário, ele será vinculado a esta residência.</p>' : ''), 'data-form="add:res"', 'Criar residência'),
  own: () => openOwnerAdd(false),
  docs: () => modal('Enviar documento', resSelect() + '<label>Arquivo<input name="file" type="file" required></label>' + DOC_F.map(f => fld(f)).join(''), 'data-form="add:docs"', 'Enviar'),
  qr: () => modal('Novo QR Code', resSelect() + `<label>Nome da etiqueta<input name="label" required></label>${fld(['target', 'Ao ler, abre', Object.keys(QR_T)])}`, 'data-form="add:qr"', 'Gerar'),
  pl: () => modal('Enviar planta (imagem PNG ou JPG)', resSelect() + '<label>Título<input name="title" required></label><label>Imagem<input name="file" type="file" accept="image/*" required></label>', 'data-form="add:pl"', 'Enviar'),
};
const telField = (name, label, v = '') => `<label>${label}<input name="${name}" class="tel" type="tel" inputmode="tel" placeholder="(00) 00000-0000" maxlength="15" value="${esc(v)}"></label>`;
function openOwnerAdd(nested) {   // nested = aberto de dentro do cadastro de residência (o vínculo é feito quando a residência for salva)
  modal('Novo proprietário', `<label>Nome<input name="name" required></label><label>CPF<input name="cpf" class="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" required></label><label>E-mail do proprietário (opcional, recomendado)<input name="email" type="email"></label>${telField('phone', 'Celular')}${telField('whatsapp', 'WhatsApp')}${nested ? '' : resMultiHtml([])}`, `data-form="add:own"${nested ? ' data-nested="1"' : ''}`, 'Salvar');
}
function openOwnerEdit(id, opts = {}) {
  const c = (S.owners || []).find(x => x.id === id); if (!c) return;
  const ids = (S.links || []).filter(l => l.cpf_id === id).map(l => S.res.find(r => r.id === l.residence_id)).filter(Boolean).sort(byName).map(r => r.id);
  modal('Editar proprietário', `<label>Nome<input name="name" value="${esc(c.name)}" required></label><label>CPF atual<input value="${esc(c.cpf_mask)}" disabled></label><label>Novo CPF (deixe em branco para manter)<input name="cpf" class="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00"></label><label>E-mail do proprietário<input name="email" type="email" value="${esc(c.expected_email || '')}"></label>${telField('phone', 'Celular', c.phone || '')}${telField('whatsapp', 'WhatsApp', c.whatsapp || '')}${opts.fromRes ? '' : resMultiHtml(ids)}`, `data-form="edit:own" data-id="${id}"`, 'Salvar');
}
function openAdd(k) { if (ADD[k]) return ADD[k](); modal('Adicionar — ' + T[k].label, resSelect() + T[k].f.map(f => fld(f)).join(''), `data-form="add:${k}"`); }
function openEdit(k, id, opts = {}) {
  if (k === 'res') { const r = S.res.find(x => x.id === id); if (!r) return; return modal('Editar cadastro', resFormBody(r, (S.ownersByRes[id] || []).map(o => o.id), !!opts.fromOwner), `data-form="edit:res" data-id="${id}"`, 'Salvar alterações'); }
  const row = (S.rows[k] || []).find(r => r.id === id); if (!row) return;
  modal('Editar', `<p class="mute">Residência: <b>${esc(resName(row.residence_id))}</b></p>` + fieldsFor(k).map(f => fld(f, row)).join(''), `data-form="edit:${k}" data-id="${id}"`, 'Salvar alterações');
}


// ---------- galeria de imagens das manutenções (Cloudinary; só imagens)
async function gallery() {
  const g = S.gal;
  const { data, error } = await sb.from('images').select('*').eq('residence_id', g.resId).eq('kind', g.kind).order('created_at');
  S.imgs = (data || []).filter(x => x.ref_id === g.refId); S.galErr = error; galleryRender();
}
function galleryRender() {
  const g = S.gal, list = S.imgs || [];
  const tile = x => `<div class="gtile"><a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(cld(x.url, 400))}" alt="" loading="lazy"></a>${x.visible === false ? ' <span class="badge">Oculto do cliente</span>' : ''}${acts(`<button class="link" data-gvis="${x.id}">${x.visible === false ? 'Mostrar ao cliente' : 'Ocultar do cliente'}</button>`, `<button class="link danger" data-gdel="${x.id}">Excluir</button>`)}</div>`;
  $('#modal').innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Imagens"><div class="sheethead"><b>Imagens — ${esc(g.title)}</b><button type="button" class="x" data-close aria-label="Fechar">×</button></div>` +
    (CLOUD_OK ? '<form data-form="gal"><label>Adicionar imagens (selecione quantas quiser)<input name="imgs" type="file" accept="image/*" multiple required></label><button>Salvar</button></form><p class="mute" id="galmsg"></p>' : cloudMissing()) +
    (S.galErr ? '<p class="empty">Rode o schema_v6.sql no Supabase para habilitar as imagens.</p>' : `<h3>${list.length} imagem(ns)</h3><div class="gallery">${list.map(tile).join('') || '<p class="empty">Nenhuma imagem enviada ainda.</p>'}</div>`) + '</div>';
  $('#modal').hidden = false;
}
const cloudMissing = () => `<p class="notice">Cloudinary não configurado. Faltando no config.js: ${[!CLD_NAME && 'CLOUDINARY_CLOUD_NAME', !CLD_PRESET && 'CLOUDINARY_UPLOAD_PRESET'].filter(Boolean).join(' e ')}.</p>`;

// envia vários arquivos ao Cloudinary e grava os links no Supabase; devolve quantos deram certo e quais falharam
async function uploadFiles(files, g, msg) {
  const res = S.res.find(r => r.id === g.resId), failed = []; let ok = 0;
  const folder = 'astell-home/' + String(res ? res.code : g.resId).replace(/[^\w-]/g, '_') + '/' + g.kind;
  for (let i = 0; i < files.length; i++) {
    const file = files[i]; if (msg) msg.textContent = `Enviando ${i + 1} de ${files.length}...`;
    try {
      const vid = /^video\//.test(file.type || ''), img = /^image\//.test(file.type || '');
      if (!img && !(vid && g.kind === 'residence')) throw new Error(g.kind === 'residence' ? 'envie apenas imagens ou vídeos' : 'envie apenas imagens');
      const max = vid ? 100 : 10; if (file.size > max * 1024 * 1024) throw new Error('maior que ' + max + ' MB');
      const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', CLD_PRESET); fd.append('folder', folder);
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLD_NAME}/auto/upload`, { method: 'POST', body: fd });
      const j = await resp.json(); if (!resp.ok) throw new Error((j.error && j.error.message) || 'erro no envio');
      const { error } = await sb.from('images').insert({ residence_id: g.resId, kind: g.kind, ref_id: g.refId || null, url: j.secure_url, public_id: j.public_id, ...(vid ? { media_type: 'video' } : {}) });
      if (error) throw error; ok++;
    } catch (e) { toast(`Falha em "${file.name}": ${e.message}`, 1); failed.push(file); }
  }
  if (msg) msg.textContent = '';
  return { ok, failed };
}
const savedMsg = n => n + (n === 1 ? ' arquivo salvo.' : ' arquivos salvos.');
async function uploadImages(form) {   // galeria das manutenções
  const r = await uploadFiles([...form.imgs.files], S.gal, $('#galmsg'));
  if (r.ok) toast(savedMsg(r.ok));
  await gallery(); render();
}

// ---------- tela de upload (Residências): arrastar e soltar ou escolher no computador
function openUpload(resId) {
  const r = S.res.find(x => x.id === resId); if (!r) return;
  S.up = { resId, files: [] };
  $('#modal').innerHTML = `<div class="sheet big" role="dialog" aria-modal="true" aria-label="Upload de imagens e vídeos"><div class="sheethead"><b>Upload de imagens e vídeos — ${esc(r.name)}</b><button type="button" class="x" data-close aria-label="Fechar">×</button></div>` +
    (CLOUD_OK ? '<div id="drop" class="dropzone"><p><b>Arraste imagens ou vídeos para cá</b></p><p class="mute">ou</p><button type="button" data-pickfiles>Selecionar arquivos do computador</button><input id="fileIn" type="file" accept="image/*,video/*" multiple hidden></div><div id="stage"></div><button type="button" data-savefiles disabled>Salvar</button><p class="mute" id="galmsg"></p><p class="notice">Imagens até 10 MB e vídeos até 100 MB. Você pode adicionar quantos arquivos quiser.</p>' : cloudMissing()) + '</div>';
  $('#modal').hidden = false;
}
function renderStage() {
  const f = S.up.files, st = $('#stage'); if (!st) return;
  st.innerHTML = f.length ? `<h3>${f.length} ${f.length === 1 ? 'arquivo' : 'arquivos'} para salvar</h3>` + f.map((x, i) => `<div class="stagerow">${/^image\//.test(x.type) ? `<img src="${URL.createObjectURL(x)}" alt="">` : '<span class="vthumb">▶</span>'}<span class="sname">${esc(x.name)} <small class="mute">· ${(x.size / 1048576).toFixed(1)} MB</small></span><button type="button" class="x" data-unstage="${i}" aria-label="Remover da lista">×</button></div>`).join('') : '';
  const b = $('[data-savefiles]'); if (b) b.disabled = !f.length;
}
function stageFiles(list) {
  if (!S.up) return;
  list.forEach(f => {
    const vid = /^video\//.test(f.type), img = /^image\//.test(f.type);
    if (!img && !vid) return toast(`"${f.name}" não é imagem nem vídeo.`, 1);
    const max = vid ? 100 : 10; if (f.size > max * 1024 * 1024) return toast(`"${f.name}" é maior que ${max} MB.`, 1);
    S.up.files.push(f);
  });
  renderStage();
}
async function saveStaged() {
  const u = S.up; if (!u || !u.files.length) return;
  const b = $('[data-savefiles]'); b.disabled = true;
  const r = await uploadFiles(u.files, { kind: 'residence', refId: null, resId: u.resId }, $('#galmsg'));
  if (r.ok) toast(savedMsg(r.ok));
  u.files = r.failed;
  if (!r.failed.length) { if (!S.cur || S.cur.id !== u.resId) { S.cur = S.res.find(x => x.id === u.resId); } S.mTab = 'all'; closeModal(); await render(); } else renderStage();
}

// ---------- imagens e vídeos da residência selecionada (tela Residências): abas, seleção e exclusão em lote
async function loadMedia() {
  if (!S.cur) { S.mediaRows = []; return; }
  const { data, error } = await sb.from('images').select('*').eq('residence_id', S.cur.id).eq('kind', 'residence').order('created_at', { ascending: false });
  S.mediaRows = data || []; S.mediaErr = error;
}
const resetSel = () => { S.sel = { on: false, ids: new Set() }; };
const renderMedia = () => { const b = $('#mediabox'); if (b) b.innerHTML = mediaPanel(); };
function mediaPanel() {
  const list = S.mediaRows || [], vids = list.filter(isVid), pics = list.filter(x => !isVid(x)), tab = S.mTab || 'all', shown = { all: list, img: pics, vid: vids }[tab] || list, sel = S.sel, n = sel.ids.size;
  const tile = x => { const ck = sel.ids.has(x.id);
    const media = isVid(x) ? `<video controls playsinline preload="metadata" poster="${esc(vposter(x.url))}" src="${esc(vsrc(x.url))}"></video><span class="badge vb">Vídeo</span>` : `<a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(cld(x.url, 400))}" alt="" loading="lazy"></a>`;
    return `<div class="gtile${ck ? ' picked' : ''}"><div class="mwrap">${media}${sel.on ? `<div class="cover" data-selid="${x.id}"></div><input type="checkbox" class="selbox" data-selid="${x.id}" ${ck ? 'checked' : ''} aria-label="Selecionar ${isVid(x) ? 'vídeo' : 'imagem'}">` : ''}</div>${x.visible === false ? '<span class="badge">Oculto do cliente</span>' : ''}${acts(`<button class="link" data-mvis="${x.id}">${x.visible === false ? 'Mostrar ao cliente' : 'Ocultar do cliente'}</button>`)}</div>`; };
  const tabs = `<div class="tabs three" role="tablist">${[['all', 'Todos', list.length], ['img', 'Imagens', pics.length], ['vid', 'Vídeos', vids.length]].map(([k, l, c]) => `<button type="button" role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-mtab="${k}">${l} (${c})</button>`).join('')}</div>`;
  const tools = `<div class="mtools"><span class="mute">${shown.length} ${shown.length === 1 ? 'item' : 'itens'}</span><span class="mbtns">${sel.on ? `<button type="button" class="btn-danger" data-seldel ${n ? '' : 'disabled'}>Excluir${n ? ` (${n})` : ''}</button><button type="button" class="ghost2" data-selmode>Cancelar</button>` : `<button type="button" class="ghost2" data-selmode ${shown.length ? '' : 'disabled'}>Selecionar</button>`}</span></div>`;
  const empty = tab === 'img' ? 'Nenhuma imagem enviada ainda.' : tab === 'vid' ? 'Nenhum vídeo enviado ainda.' : 'Nada enviado ainda. Use "Upload de imagens e vídeos".';
  return `<div class="pagehead mhead"><div><h3 style="margin:0">Imagens e vídeos</h3><p class="mute">Residência: <b>${esc(S.cur.name)}</b> — ${esc(S.cur.code)}</p></div><button type="button" class="up" data-upl="res:${S.cur.id}">Upload de imagens e vídeos</button></div>` +
    (S.mediaErr ? '<p class="empty">Rode o schema_v6.sql (e o v7) no Supabase para habilitar as imagens e vídeos.</p>' : tabs + tools + `<div class="gallery">${shown.map(tile).join('') || `<p class="empty">${empty}</p>`}</div>`);
}


// ---------- dados auxiliares: residências e proprietários
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
async function reloadRes() { const { data } = await sb.from('residences').select('*').order('created_at', { ascending: false }); S.res = data || []; }
async function loadOwners() {
  const [{ data: cl }, { data: lk }] = await Promise.all([sb.from('client_cpfs').select('*').order('created_at', { ascending: false }), sb.from('cpf_residences').select('cpf_id,residence_id')]);
  S.owners = cl || []; S.links = lk || []; S.ownersByRes = {};
  S.links.forEach(l => { const c = S.owners.find(x => x.id === l.cpf_id); if (c) (S.ownersByRes[l.residence_id] = S.ownersByRes[l.residence_id] || []).push(c); });
}
const resName = id => { const r = S.res.find(x => x.id === id); return r ? r.name : '—'; };
const ownNames = rid => (S.ownersByRes[rid] || []).map(o => esc(o.name)).join(', ') || '—';
// linhas que todo card de elemento mostra abaixo do título: a residência e, abaixo dela, o(s) proprietário(s)
const metaHtml = rid => `<span class="mute meta">Residência: ${esc(resName(rid))}</span><span class="mute meta">Proprietários: ${ownNames(rid)}</span>`;
const hayOf = (rid, ...extra) => { const r = S.res.find(x => x.id === rid) || {}; return norm([...extra, r.name, r.code, ...(S.ownersByRes[rid] || []).map(o => o.name)].join(' ')); };

// ---------- pesquisa dos módulos: cada tela registra seus itens e a barra de pesquisa filtra por residência, proprietário e título
const SHELL = '<p class="mute" id="mcount"></p><div id="mlist"></div><div id="pg-mlist"></div>';
function pagerHtml(id, total, pg, pages) {
  const set = [...new Set([1, pages, pg - 2, pg - 1, pg, pg + 1, pg + 2].filter(n => n >= 1 && n <= pages))].sort((x, y) => x - y); let prev = 0; const nums = [];
  set.forEach(n => { if (n - prev > 1) nums.push('<span class="dots">…</span>'); nums.push(`<button type="button" class="pgbtn${n === pg ? ' cur' : ''}" data-pg="${id}:${n}" ${n === pg ? 'aria-current="page"' : ''} aria-label="Página ${n}">${n}</button>`); prev = n; });
  return `<div class="pager" role="navigation" aria-label="Paginação"><span class="mute pginfo">${(pg - 1) * S.pp + 1}–${Math.min(total, pg * S.pp)} de ${total}</span><div class="pgnums"><button type="button" class="pgbtn" data-pg="${id}:${pg - 1}" ${pg === 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>${nums.join('')}<button type="button" class="pgbtn" data-pg="${id}:${pg + 1}" ${pg === pages ? 'disabled' : ''} aria-label="Próxima página">›</button></div><label class="pp">Por página <select data-pp aria-label="Itens por página">${PP.map(n => `<option ${n === S.pp ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>`;
}
function paintItems() {
  const q = norm(S.q).trim(), raw = S.q.trim(), noun = S.noun || ['item', 'itens'];
  Object.entries(S.items || {}).forEach(([id, items], n) => {
    const el = $('#' + id); if (!el) return;
    const list = q ? items.filter(i => i.hay.includes(q)) : items, pages = Math.max(1, Math.ceil(list.length / S.pp)), pg = Math.min(Math.max(1, S.pages[id] || 1), pages);
    S.pages[id] = pg;
    el.innerHTML = list.length ? list.slice((pg - 1) * S.pp, pg * S.pp).map(i => i.html).join('') : `<p class="empty">${items.length ? `Nada encontrado para “${esc(raw)}”.` : ((S.empties || {})[id] || 'Nada cadastrado ainda. Toque em + para adicionar.')}</p>`;
    const bar = $('#pg-' + id); if (bar) bar.innerHTML = list.length ? pagerHtml(id, list.length, pg, pages) : '';
    const c = n === 0 && $('#mcount'); if (c) c.textContent = q ? `${list.length} de ${items.length} ${items.length === 1 ? noun[0] : noun[1]}` : `${items.length} ${items.length === 1 ? noun[0] : noun[1]}`;
  });
}
const setItems = (map, empties = {}) => { S.items = map; S.empties = empties; };

// ---------- Residências: lista de cards com pesquisa e tela de cadastro de cada residência
async function resList() {
  await loadOwners();
  setItems({ mlist: S.res.map(r => ({ hay: norm([r.name, r.code, ...(S.ownersByRes[r.id] || []).map(o => o.name)].join(' ')), html: `<a class="card rescard" href="#res/${r.id}"><b>${esc(r.name)}</b><span class="mute">${esc(r.code)} · ${esc(r.address || 'sem endereço')}</span><span class="mute">Proprietários: ${ownNames(r.id)}</span><span class="mute">Obra: ${fmt(r.start_date)} → ${fmt(r.delivery_date)}</span></a>` })) }, { mlist: 'Nenhuma residência cadastrada. Toque em + para adicionar a primeira.' });
  S.noun = ['residência', 'residências'];
  view.innerHTML = head('Residências', 'res') + SHELL.replace('id="mlist"', 'id="mlist" class="rescards"'); paintItems();
}
const contactLine = c => `${c.phone ? `<span class="mute meta">Celular: ${esc(c.phone)}</span>` : ''}${c.whatsapp ? `<span class="mute meta">WhatsApp: <a class="golda" href="https://wa.me/55${telDigits(c.whatsapp)}" target="_blank" rel="noopener">${esc(c.whatsapp)}</a></span>` : ''}`;
async function resDetail(id) {
  const r = S.res.find(x => x.id === id);
  if (!r) { view.innerHTML = '<p class="empty">Residência não encontrada.</p>'; view.insertAdjacentHTML('afterbegin', crumbs([['Painel', '#res'], ['Residências', '#res'], ['Não encontrada']])); return; }
  S.cur = r; resetSel(); await Promise.all([loadMedia(), loadOwners()]);
  const ow = S.ownersByRes[r.id] || [], v = x => esc(x == null || x === '' ? '—' : x);
  const info = [['Código', r.code], ['Nome da residência', r.name], ['Endereço', r.address], ['Área construída', r.area_m2 != null && r.area_m2 !== '' ? r.area_m2 + ' m²' : ''], ['Pavimentos', r.floors], ['Sistema construtivo', r.build_system], ['Nº do projeto', r.project_no], ['Início da obra', r.start_date ? fmt(r.start_date) : ''], ['Entrega', r.delivery_date ? fmt(r.delivery_date) : ''], ['Responsável técnico', r.tech_lead], ['Observações', r.notes]];
  view.innerHTML = crumbs([['Painel', '#res'], ['Residências', '#res'], [r.name]]) + `<div class="pagehead"><div><h2>${esc(r.name)}</h2><p class="mute">${esc(r.code)}</p></div><button type="button" class="up" data-edit="res:${r.id}">Editar cadastro</button></div>` +
    `<div class="detailgrid"><section class="card"><h3 style="margin-top:0">Cadastro</h3><div class="info">${info.map(([l, x]) => `<div><span class="mute">${l}</span><b>${v(x)}</b></div>`).join('')}</div></section>` +
    `<section class="card"><h3 style="margin-top:0">Proprietários (${ow.length})</h3>${ow.map(o => `<p><b>${esc(o.name)}</b><span class="mute">${esc(o.cpf_mask)} · ${o.claimed_by ? 'Acesso ativo' : 'Aguardando primeiro acesso'}</span>${contactLine(o)}</p>`).join('') || '<p class="empty">Nenhum proprietário vinculado.</p>'}<a class="golda" href="#own">Gerenciar proprietários</a></section></div>` +
    `<div id="mediabox">${mediaPanel()}</div>`;
}

// ---------- páginas dos módulos (independentes: mostram tudo, por ordem de cadastro, de todas as residências)
const crumbs = items => `<div class="crumbs" role="navigation" aria-label="Caminho de navegação"><ol>${items.map(([l, h], i) => i === items.length - 1 ? `<li aria-current="page">${esc(l)}</li>` : `<li><a href="${h}">${esc(l)}</a></li>`).join('')}</ol></div>`;
const head = (t, add, trail) => crumbs(trail || [['Painel', '#res'], [t]]) + `<div class="pagehead"><div><h2>${t}</h2></div>${add ? `<button class="add" data-add="${add}" aria-label="Adicionar" title="Adicionar">+</button>` : ''}</div>`;
const acts = (...b) => `<div class="acts">${b.filter(Boolean).join('')}</div>`;
const visBtn = (k, r) => `<button class="link" data-vis="${k}:${r.id}">${r.visible ? 'Ocultar do cliente' : 'Mostrar ao cliente'}</button>`;
const hid = r => r.visible === false ? '<p><span class="badge">Oculto do cliente</span></p>' : '';
const TITLE = { warranties: r => r.system, maintenance_tasks: r => r.name, equipment: r => r.name, contacts: r => r.name, building_items: r => r.title };

async function listPage(k) {
  const c = T[k];
  await loadOwners();
  const { data, error } = await sb.from(k).select('*').order('created_at', { ascending: false });
  if (error) throw error; S.rows[k] = data;
  const im = {};
  if (k === 'maintenance_tasks') { const { data: ii } = await sb.from('images').select('url,ref_id').eq('kind', 'maintenance').order('created_at'); (ii || []).forEach(x => (im[x.ref_id] = im[x.ref_id] || []).push(x)); }
  setItems({ mlist: data.map(r => {
    const raw = c.row(r), i = raw.indexOf('</b>') + 4;
    return { hay: hayOf(r.residence_id, TITLE[k](r)), html: `<div class="card">${raw.slice(0, i)}${metaHtml(r.residence_id)}${raw.slice(i)}${k === 'maintenance_tasks' ? thumbsOf(im[r.id]) : ''}${hid(r)}${acts(`<button class="link" data-edit="${k}:${r.id}">Editar</button>`, 'visible' in r && visBtn(k, r), k === 'maintenance_tasks' && `<button class="link" data-done="${r.id}">Marcar como executada</button>`, k === 'maintenance_tasks' && `<button class="link" data-gal="man:${r.id}">Imagens (${(im[r.id] || []).length})</button>`, `<button class="link danger" data-del="${k}:${r.id}">Excluir</button>`)}</div>` };
  }) });
  view.innerHTML = head(c.label, k) + SHELL + (c.note ? `<p class="notice">${c.note}</p>` : '');
  paintItems();
}

async function plantaDetail(id) {
  await loadOwners();
  const { data: fp } = await sb.from('floorplans').select('*').eq('id', id), cur = (fp || [])[0];
  if (!cur) { view.innerHTML = crumbs([['Painel', '#res'], ['Planta técnica', '#pl'], ['Não encontrada']]) + '<p class="empty">Planta não encontrada.</p>'; return; }
  S.curPlan = cur;
  const [{ data: u }, { data: pts }] = await Promise.all([sb.storage.from('documents').createSignedUrl(cur.path, 3600), sb.from('plan_points').select('*').eq('floorplan_id', id).order('created_at')]);
  view.innerHTML = crumbs([['Painel', '#res'], ['Planta técnica', '#pl'], [cur.title]]) + `<div class="pagehead"><div><h2>${esc(cur.title)}</h2>${metaHtml(cur.residence_id)}</div></div>` +
    acts(`<button class="link" data-place>${S.place ? 'Parar de marcar pontos' : 'Marcar pontos na planta'}</button>`, `<button class="link danger" data-delplan="${cur.id}|${esc(cur.path)}">Excluir esta planta</button>`) + (S.place ? '<p class="notice">Toque na planta onde fica o ponto, conforme o projeto.</p>' : '') +
    `<div class="plan ${S.place ? 'placing' : ''}" style="margin-top:12px"><img data-plan="1" src="${u ? esc(u.signedUrl) : ''}" alt="${esc(cur.title)}">${(pts || []).map(p => `<span class="pin" title="${esc(p.label)}" style="left:${p.x}%;top:${p.y}%"></span>`).join('')}</div><h3>Pontos cadastrados</h3>` +
    ((pts || []).map(p => `<div class="card"><b>${esc(p.label)}</b><span class="mute">${esc(p.category)}</span><p>${esc(p.description)}</p>${acts(`<button class="link danger" data-del="plan_points:${p.id}">Excluir ponto</button>`)}</div>`).join('') || '<p class="empty">Nenhum ponto marcado.</p>');
}

const PAGES = {
  async res() { if (S.arg) return resDetail(S.arg); return resList(); },
  async own() {
    await loadOwners();
    setItems({ mlist: S.owners.map(c => {
      const rs = S.links.filter(l => l.cpf_id === c.id).map(l => S.res.find(r => r.id === l.residence_id)).filter(Boolean);
      return { hay: norm([c.name, ...rs.map(r => r.name + ' ' + r.code)].join(' ')), html: `<div class="card"><b>${esc(c.name)}</b><span class="mute meta">Residências: ${rs.map(r => esc(r.name)).join(', ') || '—'}</span><span class="mute meta">${esc(c.cpf_mask)} · ${c.claimed_by ? 'Acesso ativo' : 'Aguardando primeiro acesso'}${c.expected_email ? ' · ' + esc(c.expected_email) : ''}</span>${contactLine(c)}${acts(`<button class="link" data-oedit="${c.id}">Editar</button>`, c.claimed_by && `<button class="link danger" data-rel="${c.id}">Liberar CPF</button>`)}</div>` };
    }) });
    view.innerHTML = head('Proprietários', 'own') + SHELL + '<p class="notice">Uma residência pode ter vários proprietários, cada um com o seu CPF. Cada um cria a própria conta no app e informa o CPF para ver a casa. Se você cadastrar o e-mail do proprietário, só a conta com esse e-mail consegue usar o CPF.</p>';
    paintItems();
  },
  async docs() {
    await loadOwners();
    const { data } = await sb.from('documents').select('*').order('created_at', { ascending: false }); S.rows.documents = data || [];
    setItems({ mlist: (data || []).map(d => ({ hay: hayOf(d.residence_id, d.title), html: `<div class="card"><b>${esc(d.title)}</b>${metaHtml(d.residence_id)}<span class="mute">${esc(d.category)} · v${esc(d.version || '1')} · ${fmt(d.created_at)}</span><p>${esc(d.description)}</p>${hid(d)}${acts(`<button class="link" data-open="${esc(d.path)}">Abrir</button>`, `<button class="link" data-edit="documents:${d.id}">Editar</button>`, visBtn('documents', d), `<button class="link danger" data-deldoc="${d.id}|${esc(d.path)}">Excluir</button>`)}</div>` })) });
    view.innerHTML = head('Documentos', 'docs') + SHELL; paintItems();
  },
  eq: () => listPage('equipment'), gar: () => listPage('warranties'), man: () => listPage('maintenance_tasks'), ctt: () => listPage('contacts'), bld: () => listPage('building_items'),
  async ast() {
    await loadOwners();
    const { data } = await sb.from('service_requests').select('*').order('created_at', { ascending: false });
    setItems({ mlist: (data || []).map(r => ({ hay: hayOf(r.residence_id, r.protocol, r.category), html: `<div class="card"><b>${esc(r.protocol)} — ${esc(r.category)}</b>${metaHtml(r.residence_id)}<span class="badge">${esc(r.status)}</span><p>${esc(r.place)} · urgência ${esc(r.urgency)}</p><p>${esc(r.description)}</p><p class="mute">Contato: ${esc(r.contact_time || '—')} · aberta em ${fmt(r.created_at)}</p>
      <form class="statusform" data-form="ast" data-id="${r.id}" data-rid="${r.residence_id}">${fld(['status', 'Alterar situação', STATUS], r)}<label>Comentário para o cliente<input name="staff_note" value="${esc(r.staff_note || '')}"></label><button>Atualizar</button></form></div>` })) }, { mlist: 'Nenhuma solicitação de assistência.' });
    view.innerHTML = head('Assistência técnica', null) + SHELL; paintItems();
  },
  async his() {
    await loadOwners();
    const f = S.hf;
    let q = sb.from('history_events').select('*').order('created_at', { ascending: false }).limit(500);
    let a = sb.from('audit_log').select('*').order('at', { ascending: false }).limit(300);
    if (f.cat) q = q.ilike('category', '%' + f.cat + '%');
    if (f.from) { q = q.gte('event_date', f.from); a = a.gte('at', f.from); }
    if (f.to) { q = q.lte('event_date', f.to); a = a.lte('at', f.to + 'T23:59:59'); }
    const [{ data: ev }, { data: au, error }, { data: pr }] = await Promise.all([q, a, sb.from('profiles').select('id,name')]);
    const who = Object.fromEntries((pr || []).map(p => [p.id, p.name]));
    const what = x => { const n = x.new_data || x.old_data || {}; if (x.action === 'UPDATE') return 'campos: ' + Object.keys(n).filter(k => k !== 'created_at' && JSON.stringify((x.old_data || {})[k]) !== JSON.stringify(n[k])).join(', '); return n.title || n.name || n.system || n.protocol || n.label || n.description || ''; };
    const items = { mlist: (ev || []).map(e => ({ hay: hayOf(e.residence_id, e.category, e.description), html: `<div class="card"><b>${fmt(e.event_date)} — ${esc(e.category)}</b>${metaHtml(e.residence_id)}<p>${esc(e.description)}</p>${acts(`<button class="link danger" data-del="history_events:${e.id}">Excluir</button>`)}</div>` })) };
    if (!error) items.mlist2 = (au || []).map(x => ({ hay: hayOf(x.residence_id, who[x.user_id], TBL[x.table_name], what(x)), html: `<div class="card"><b>${esc(who[x.user_id] || 'Sistema')} ${ACT[x.action] || ''} ${esc((TBL[x.table_name] || x.table_name).toLowerCase())}</b>${metaHtml(x.residence_id)}<span class="mute">${new Date(x.at).toLocaleString('pt-BR')}</span><p class="mute">${esc(what(x))}</p></div>` }));
    setItems(items, { mlist: 'Nenhum evento no período.', mlist2: 'Nenhuma alteração registrada.' });
    view.innerHTML = head('Histórico', 'history_events') + `<form class="card" data-form="hf"><b>Filtros</b><label>Categoria contém<input name="cat" value="${esc(f.cat || '')}"></label>${dateField('from', 'De', f.from || '')}${dateField('to', 'Até', f.to || '')}<button>Filtrar</button><button type="button" class="ghost2" data-hclear>Limpar filtros</button></form><h3>Linha do tempo</h3>${SHELL}` +
      '<h3>Alterações registradas no sistema</h3>' + (error ? '<p class="empty">O registro de alterações ainda não está disponível. Rode o schema_v5_corrigido.sql.</p>' : '<div id="mlist2"></div><div id="pg-mlist2"></div>');
    paintItems();
  },
  async qr() {
    await loadOwners();
    const { data } = await sb.from('qr_codes').select('*').order('created_at', { ascending: false });
    const base = new URL('index.html', location.href.split('#')[0]).href;
    const svg = t => { const q = qrcode(0, 'M'); q.addData(base + '#qr/' + t); q.make(); return q.createSvgTag(5, 0); };
    setItems({ mlist: (data || []).map(q => ({ hay: hayOf(q.residence_id, q.label), html: `<div class="card qr">${svg(q.token)}<b>${esc(q.label)}</b>${metaHtml(q.residence_id)}<span class="mute qrcode">Astell Home · ${esc((S.res.find(r => r.id === q.residence_id) || {}).code || '')}</span>${acts(`<button class="link danger" data-del="qr_codes:${q.id}">Excluir</button>`)}</div>` })) }, { mlist: 'Nenhum QR Code. Toque em + para gerar.' });
    view.innerHTML = head('QR Codes', 'qr') + acts('<button class="link" data-print>Imprimir etiquetas</button>') + '<p class="mute" id="mcount"></p><div id="mlist" class="grid"></div><div id="pg-mlist"></div><p class="notice">O QR leva ao app do cliente (index.html). Quem ler precisa entrar com a conta vinculada à casa para ver qualquer informação.</p>';
    paintItems();
  },
  async pl() {
    if (S.arg) return plantaDetail(S.arg);
    await loadOwners();
    const { data } = await sb.from('floorplans').select('*').order('created_at', { ascending: false });
    setItems({ mlist: (data || []).map(p => ({ hay: hayOf(p.residence_id, p.title), html: `<a class="card rescard" href="#pl/${p.id}"><b>${esc(p.title)}</b>${metaHtml(p.residence_id)}</a>` })) }, { mlist: 'Nenhuma planta enviada. Toque em + para enviar uma imagem da planta.' });
    view.innerHTML = head('Planta técnica', 'pl') + SHELL.replace('id="mlist"', 'id="mlist" class="rescards"'); paintItems();
  },
};

async function render() {
  if (!S.profile || S.profile.role !== 'admin') return;
  const [key, arg] = (location.hash.slice(1) || 'res').split('/'), m = MENU.find(x => x[0] === key) || MENU[0]; S.menu = m[0];
  S.arg = ['res', 'pl'].includes(S.menu) ? (arg || null) : null; view.classList.toggle('wide', !!S.arg);
  if (S.lastMenu !== S.menu) { S.q = ''; $('#resSearch').value = ''; S.lastMenu = S.menu; S.pages = {}; }
  S.noun = null;   // cada módulo começa com a pesquisa vazia
  document.querySelectorAll('#drawer a[data-m]').forEach(a => a.classList.toggle('on', a.dataset.m === S.menu));
  S.items = null;
  try { await PAGES[S.menu](); } catch (e) { view.innerHTML = '<p class="empty">Não foi possível carregar esta tela. ' + esc(e.message || '') + '</p>'; }
}
async function loadRes(pick) {
  await reloadRes();
  S.cur = S.res.find(r => r.id === pick) || S.res.find(r => S.cur && r.id === S.cur.id) || S.res[0] || null; render();
}


// ---------- menu lateral
function buildDrawer() {
  $('#drawer').innerHTML = `<div class="dhead"><strong class="logo">ASTELL<span>PAINEL ADMINISTRATIVO</span></strong><button type="button" class="dclose" data-dclose aria-label="Fechar menu">×</button></div><div class="dnav">${MENU.map(([k, l, i]) => `<a href="#${k}" data-m="${k}">${ico(IC[i])}<span>${l}</span></a>`).join('')}</div><div class="dfoot"><a href="index.html">${ico(IC.casa)}<span>Ver app do cliente</span></a><button type="button" class="ghost" data-out>Sair</button></div>`;
}
function drawer(open) { $('#drawer').classList.toggle('open', open); document.body.classList.toggle('nav-open', open); $('#drawer').setAttribute('aria-hidden', !open); $('#menuBtn').setAttribute('aria-expanded', open); if (open) { const x = $('#drawer .dclose'); if (x) x.focus(); } }
$('#menuBtn').onclick = () => drawer(true);   // o menu só abre aqui; para fechar é preciso clicar no X
$('#resSearch').addEventListener('input', e => {   // filtra a lista do módulo aberto (residências, ou os cards de cada módulo)
  S.q = e.target.value; const key = location.hash.slice(1) || 'res', [mod] = key.split('/');
  if (key.includes('/')) location.hash = '#' + mod; else { S.pages = {}; paintItems(); }
});
addEventListener('hashchange', () => { S.place = false; render(); });
addEventListener('keydown', e => { if (e.key === 'Escape') { if (!closeFloating()) closeModal(); } });

// ---------- acesso
function loginScreen() {
  $('#top').hidden = true; drawer(false);
  view.innerHTML = `<div class="login"><form id="lf"><h1>ASTELL<span>PAINEL ADMINISTRATIVO</span></h1><p class="tag">Acesso restrito à equipe Astell.</p><h2>Entrar</h2>
    <button type="button" class="btn-google" id="gg">${GOOGLE_SVG}<span>Entrar com o Google</span></button><div class="or"><span>ou</span></div>
    <label>E-mail<input id="em" type="email" required autocomplete="username"></label><label>Senha<input id="pw" type="password" required autocomplete="current-password"></label>
    <button class="btn-main">Entrar no painel</button><p class="fine"><a href="index.html" style="color:#9fb5c1">Ir para o aplicativo do cliente</a></p></form></div>`;
  $('#gg').onclick = async () => { if (location.protocol === 'file:') return toast('O login com Google não funciona com o arquivo aberto direto. Abra por um endereço http ou https.', 1); const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }); if (error) toast('Não foi possível entrar com o Google.', 1); };
  $('#lf').onsubmit = async e => { e.preventDefault(); const { error } = await sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value }); if (error) toast('E-mail ou senha incorretos.', 1); };
}
function deniedScreen() {
  $('#top').hidden = true; drawer(false);
  view.innerHTML = `<div class="login"><form><h1>ASTELL<span>PAINEL ADMINISTRATIVO</span></h1><h2 style="margin-top:28px">Acesso restrito</h2><p class="lead">Esta conta não tem permissão de administrador. Se você é cliente, use o aplicativo.</p><a href="index.html"><button type="button" class="btn-main">Ir para o aplicativo</button></a><button type="button" class="btn-text" data-out>Sair</button></form></div>`;
}
async function start(session) {
  if (!session) { S.profile = null; S.cur = null; return loginScreen(); }
  const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  S.profile = data;
  if (!data || data.role !== 'admin') return deniedScreen();
  $('#top').hidden = false; buildDrawer(); await loadRes();
}
sb.auth.getSession().then(({ data }) => start(data.session));
sb.auth.onAuthStateChange((ev, s) => {
  if (ev === 'SIGNED_IN' && S.profile && s && S.profile.id === s.user.id) return;
  if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(() => start(s), 0);
});


// ---------- ações
document.addEventListener('click', async e => {
  if (e.target.id === 'modal') return closeModal();
  if (e.target.classList && e.target.classList.contains('comboq')) comboList(e.target.closest('.combo'));
  closeFloating(e.target);   // clique fora fecha calendário e listas de pesquisa
  const el = e.target.closest('[data-dclose],[data-cal],[data-calnav],[data-day],[data-caltoday],[data-calclear],[data-pg],[data-newres],[data-newown],[data-ownunlink],[data-ownedit],[data-oedit],[data-addopt],[data-reedit],[data-reunlink],[data-upl],[data-pickfiles],[data-unstage],[data-savefiles],[data-mtab],[data-selmode],[data-selid],[data-seldel],[data-mvis],[data-gal],[data-gvis],[data-gdel],[data-add],[data-edit],[data-vis],[data-del],[data-done],[data-open],[data-rel],[data-deldoc],[data-delplan],[data-close],[data-place],[data-plan],[data-print],[data-hclear],[data-out]');
  if (!el) return; const d = el.dataset, done = (err, ok) => { err ? toast(err, 1) : toast(ok); render(); };
  if (d.close !== undefined) { if (S.stack.length) popModal(null); else { hardClose(); await render(); } }
  // botão "Cadastrar" ao lado do select de residência: abre o cadastro por cima e, ao salvar, volta com a nova residência já selecionada
  if (d.newres !== undefined) { const box = el.closest('.combo'); pushModal(r => comboPick(box, r.id)); ADD.res(box.dataset.combo === 'resmulti'); }
  if (d.dclose !== undefined) drawer(false);
  if (d.cal !== undefined) { const box = el.closest('[data-date]'), pop = box.querySelector('.calpop'); if (pop.hidden) calOpen(box); else pop.hidden = true; }
  if (d.calnav) { const box = el.closest('[data-date]'), pop = box.querySelector('.calpop'), dt = new Date(+pop.dataset.y, +pop.dataset.m + +d.calnav, 1); calRender(box, dt.getFullYear(), dt.getMonth()); }
  if (d.day) { const box = el.closest('[data-date]'); calSet(box, d.day); box.querySelector('.calpop').hidden = true; }
  if (d.caltoday !== undefined) { const box = el.closest('[data-date]'), n = new Date(); calSet(box, isoOf(n.getFullYear(), n.getMonth(), n.getDate())); box.querySelector('.calpop').hidden = true; }
  if (d.calclear !== undefined) { const box = el.closest('[data-date]'); calSet(box, ''); box.querySelector('.calpop').hidden = true; }
  if (d.pg) { const [id, n] = d.pg.split(':'); S.pages[id] = +n; paintItems(); const t = $('#' + id); if (t) window.scrollTo({ top: Math.max(0, t.getBoundingClientRect().top + scrollY - 160), behavior: 'smooth' }); }
  // botão "Cadastrar" ao lado dos proprietários (dentro do cadastro de residência)
  if (d.newown !== undefined) { const box = el.closest('.ownpick'), hid = box.querySelector('[name=owner_ids]'); pushModal(o => { hid.value = [...(hid.value ? hid.value.split(',') : []), o.id].join(','); refreshOwnPick(box); }); openOwnerAdd(true); }
  if (d.ownunlink) { const box = el.closest('.ownpick'), h = box.querySelector('[name=owner_ids]'); h.value = h.value.split(',').filter(x => x && x !== d.ownunlink).join(','); refreshOwnPick(box); }
  if (d.ownedit) { const box = el.closest('.ownpick'); pushModal(() => refreshOwnPick(box)); openOwnerEdit(d.ownedit, { fromRes: true }); }
  if (d.gal) { const [, id] = d.gal.split(':'), t = S.rows.maintenance_tasks.find(x => x.id === id); S.gal = { kind: 'maintenance', refId: id, resId: t.residence_id, title: t.name }; gallery(); }
  if (d.upl) openUpload(d.upl.split(':')[1]);
  if (d.pickfiles !== undefined) $('#fileIn').click();
  if (d.unstage !== undefined) { S.up.files.splice(+d.unstage, 1); renderStage(); }
  if (d.savefiles !== undefined) saveStaged();
  if (d.mtab) { S.mTab = d.mtab; resetSel(); renderMedia(); }
  if (d.selmode !== undefined) { S.sel = { on: !S.sel.on, ids: new Set() }; renderMedia(); }
  if (d.selid) { const s = S.sel.ids; if (s.has(d.selid)) s.delete(d.selid); else s.add(d.selid); renderMedia(); }
  if (d.seldel !== undefined && S.sel.ids.size) {
    const ids = [...S.sel.ids];
    if (confirm(`Excluir ${ids.length} ${ids.length === 1 ? 'item selecionado' : 'itens selecionados'}? Eles deixam de aparecer no app. Os arquivos continuam guardados no Cloudinary.`)) {
      const { error } = await sb.from('images').delete().in('id', ids);
      if (error) toast('Não foi possível excluir.', 1); else toast(ids.length === 1 ? 'Item excluído.' : ids.length + ' itens excluídos.');
      resetSel(); await loadMedia(); renderMedia();
    }
  }
  if (d.mvis) { const x = S.mediaRows.find(i => i.id === d.mvis); const { error } = await sb.from('images').update({ visible: x.visible === false }).eq('id', x.id); if (error) toast('Não foi possível alterar.', 1); await loadMedia(); renderMedia(); }
  if (d.gvis) { const x = S.imgs.find(i => i.id === d.gvis); const { error } = await sb.from('images').update({ visible: x.visible === false }).eq('id', x.id); if (error) toast('Não foi possível alterar.', 1); await gallery(); }
  if (d.gdel && confirm('Excluir esta imagem do sistema? O arquivo continua guardado no Cloudinary.')) { const { error } = await sb.from('images').delete().eq('id', d.gdel); if (error) toast('Não foi possível excluir.', 1); else toast('Imagem excluída.'); await gallery(); }
  if (d.add) openAdd(d.add);
  if (d.edit) { const [k, id] = d.edit.split(':'); openEdit(k, id); }
  if (d.vis) { const [k, id] = d.vis.split(':'), r = S.rows[k].find(x => x.id === id); const { error } = await sb.from(k).update({ visible: !r.visible }).eq('id', id); done(error && 'Não foi possível alterar.', r.visible ? 'Oculto do cliente.' : 'Visível ao cliente.'); }
  if (d.del && confirm('Excluir este registro?')) { const [k, id] = d.del.split(':'); const { error } = await sb.from(k).delete().eq('id', id); done(error && 'Não foi possível excluir.', 'Registro excluído.'); }
  if (d.deldoc && confirm('Excluir este documento?')) { const [id, p] = d.deldoc.split('|'); await sb.storage.from('documents').remove([p]); const { error } = await sb.from('documents').delete().eq('id', id); done(error && 'Não foi possível excluir.', 'Documento excluído.'); }
  if (d.delplan && confirm('Excluir esta planta e todos os pontos marcados nela?')) { const [id, p] = d.delplan.split('|'); await sb.storage.from('documents').remove([p]); const { error } = await sb.from('floorplans').delete().eq('id', id); if (error) toast('Não foi possível excluir.', 1); else { toast('Planta excluída.'); location.hash = '#pl'; } }
  if (d.open) { const { data, error } = await sb.storage.from('documents').createSignedUrl(d.open, 60); error ? toast('Não foi possível abrir.', 1) : window.open(data.signedUrl, '_blank', 'noopener'); }
  if (d.done) {
    const t = S.rows.maintenance_tasks.find(x => x.id === d.done), today = new Date().toISOString().slice(0, 10), nx = t.interval_months ? addMonths(today, +t.interval_months).toISOString().slice(0, 10) : null;
    const { error } = await sb.from('maintenance_tasks').update({ last_done: today, next_due: nx, status: nx ? 'Pendente' : 'Concluída' }).eq('id', t.id);
    if (!error) await sb.from('history_events').insert({ residence_id: t.residence_id, category: 'Manutenção', description: 'Manutenção executada: ' + t.name });
    done(error && 'Não foi possível registrar.', 'Execução registrada.');
  }
  if (d.oedit) openOwnerEdit(d.oedit);
  if (d.addopt) comboPick(el.closest('.combo'), d.addopt);
  if (d.reunlink) { const box = el.closest('.resmulti'), h = box.querySelector('[name=res_ids]'); h.value = h.value.split(',').filter(x => x && x !== d.reunlink).join(','); refreshResMulti(box); }
  if (d.reedit) { const box = el.closest('.resmulti'); pushModal(() => refreshResMulti(box)); openEdit('res', d.reedit, { fromOwner: true }); }
  if (d.rel && confirm('Liberar este CPF? O acesso atual do cliente será removido e outro cadastro poderá usá-lo.')) { const { error } = await sb.rpc('admin_release_cpf', { p_cpf: d.rel }); done(error && 'Não foi possível liberar.', 'CPF liberado.'); }
  if (d.place !== undefined) { S.place = !S.place; render(); }
  if (d.plan && S.place) { const b = el.getBoundingClientRect(); S.pend = { x: +((e.clientX - b.left) / b.width * 100).toFixed(2), y: +((e.clientY - b.top) / b.height * 100).toFixed(2) }; modal('Novo ponto na planta', fld(['category', 'Categoria', PT_CATS]) + '<label>Identificação<input name="label" required></label><label>Detalhes<textarea name="description" rows="3"></textarea></label>', 'data-form="add:pt"', 'Salvar ponto'); }
  if (d.print !== undefined) print();
  if (d.hclear !== undefined) { S.hf = {}; render(); }
  if (d.out !== undefined) sb.auth.signOut();
});
document.addEventListener('change', e => {
  if (e.target.id === 'fileIn') { stageFiles([...e.target.files]); e.target.value = ''; }
  if (e.target.matches && e.target.matches('[data-pp]')) { S.pp = +e.target.value; try { localStorage.setItem('astell_pp', S.pp); } catch (x) { /* ok */ } S.pages = {}; paintItems(); }
});
document.addEventListener('dragover', e => { if ($('#modal').hidden) return; e.preventDefault(); const z = $('#drop'); if (z) z.classList.toggle('over', !!(e.target.closest && e.target.closest('#drop'))); });
document.addEventListener('dragleave', e => { const z = $('#drop'); if (z && !e.relatedTarget) z.classList.remove('over'); });
document.addEventListener('drop', e => { if ($('#modal').hidden) return; e.preventDefault(); const z = $('#drop'); if (z) z.classList.remove('over'); if (e.target.closest && e.target.closest('#drop') && e.dataTransfer) stageFiles([...e.dataTransfer.files]); });
document.addEventListener('input', e => {
  const t = e.target; if (!t.classList) return;
  if (t.classList.contains('cpf')) t.value = cpfMask(t.value);
  if (t.classList.contains('tel')) t.value = telMask(t.value);
  if (t.classList.contains('datetxt')) {   // dd/mm/aaaa
    const box = t.closest('[data-date]'), d = t.value.replace(/\D/g, '').slice(0, 8);
    t.value = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    const iso = parseBr(t.value); box.querySelector('[type=hidden]').value = iso || ''; t.setCustomValidity(t.value && !iso ? 'Data inválida. Use dd/mm/aaaa.' : '');
    if (iso && !box.querySelector('.calpop').hidden) calRender(box, +iso.slice(0, 4), +iso.slice(5, 7) - 1);
  }
  if (t.classList.contains('comboq')) { const box = t.closest('.combo'); if (box.dataset.combo === 'res') { box.querySelector('[name=residence_id]').value = ''; t.setCustomValidity('Escolha uma residência da lista.'); } comboList(box); }
});
document.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('comboq')) comboList(e.target.closest('.combo')); });
document.addEventListener('mousedown', e => { const li = e.target.closest && e.target.closest('.combolist li[data-opt]'); if (!li) return; e.preventDefault(); const box = li.closest('.combo'); if (!['resmulti', 'own'].includes(box.dataset.combo)) comboPick(box, li.dataset.opt); });   // na lista de residências do proprietário só o botão Adicionar escolhe
document.addEventListener('keydown', e => {   // setas, Enter e Esc dentro da pesquisa de residência/proprietário
  const q = e.target.classList && e.target.classList.contains('comboq') ? e.target : null; if (!q) return;
  const box = q.closest('.combo'), ul = box.querySelector('.combolist'), lis = [...ul.querySelectorAll('li[data-opt]')]; let i = lis.findIndex(l => l.classList.contains('on'));
  if (e.key === 'Escape' && !ul.hidden) { e.preventDefault(); comboClose(box); e.stopPropagation(); return; }   // preventDefault: o Esc nativo do campo de busca apagaria o texto
  if (e.key === 'Enter') { e.preventDefault(); if (!ul.hidden && i >= 0) comboPick(box, lis[i].dataset.opt); return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (ul.hidden) return comboList(box); if (!lis.length) return; if (i >= 0) lis[i].classList.remove('on'); i = (i + (e.key === 'ArrowDown' ? 1 : -1) + lis.length) % lis.length; lis[i].classList.add('on'); lis[i].scrollIntoView({ block: 'nearest' }); }
});

const ownerParams = (o, cpf) => ({ p_name: o.name, p_cpf: cpf, p_email: o.email || null, ...(o.phone ? { p_phone: o.phone } : {}), ...(o.whatsapp ? { p_whatsapp: o.whatsapp } : {}) });
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
document.addEventListener('submit', async e => {
  const f = e.target, id = f.dataset.form; if (!id) return; e.preventDefault();
  if (id === 'gal') return uploadImages(f);
  const o = clean(Object.fromEntries(new FormData(f))), [op, k] = id.split(':'), nested = S.stack.length > 0; let r;
  if (id === 'hf') { S.hf = o; return render(); }
  if (op === 'add' && (T[k] || ['docs', 'qr', 'pl'].includes(k)) && !o.residence_id) return toast('Selecione a residência (ou cadastre uma nova ao lado).', 1);
  const rid = o.residence_id;
  if (id === 'ast') { r = await sb.from('service_requests').update({ status: o.status, staff_note: o.staff_note }).eq('id', f.dataset.id); if (!r.error) await sb.from('history_events').insert({ residence_id: f.dataset.rid, category: 'Assistência', description: 'Solicitação atualizada: ' + o.status }); }
  else if (id === 'add:res') {
    const { owner_ids, ...fields } = o; r = await sb.from('residences').insert(fields).select().single();
    if (!r.error) {
      const ids = (owner_ids || '').split(',').filter(Boolean); let linkErr = false;
      for (const oid of ids) { const l = await sb.rpc('admin_link_cpf', { p_cpf: oid, p_res: r.data.id }); if (l.error) linkErr = true; }
      await reloadRes(); const novo = r.data;
      if (linkErr) toast('Residência cadastrada, mas não foi possível vincular todos os proprietários.', 1);
      if (nested) { popModal(novo); if (!linkErr) toast('Residência cadastrada e selecionada.'); return; }
      closeModal(); await loadRes(novo.id); location.hash = '#res/' + novo.id; if (!linkErr) toast('Residência cadastrada. Complete o cadastro e envie as imagens e vídeos.'); return;
    }
  }
  else if (id === 'edit:res') {
    const { owner_ids, ...fields } = o; r = await sb.from('residences').update(fields).eq('id', f.dataset.id);
    if (!r.error) {
      if ('owner_ids' in o) {   // só sincroniza proprietários quando o campo existe (ele some ao editar a residência a partir de um proprietário)
        const antes = (S.ownersByRes[f.dataset.id] || []).map(x => x.id), depois = (owner_ids || '').split(',').filter(Boolean);
        for (const oid of depois.filter(x => !antes.includes(x))) await sb.rpc('admin_link_cpf', { p_cpf: oid, p_res: f.dataset.id });
        for (const oid of antes.filter(x => !depois.includes(x))) await sb.rpc('admin_unlink_cpf', { p_cpf: oid, p_res: f.dataset.id });
      }
      if (nested) { await reloadRes(); popModal({ id: f.dataset.id }); return toast('Dados da residência salvos.'); }
      closeModal(); await loadRes(f.dataset.id); return toast('Dados da residência salvos.');
    }
  }
  else if (id === 'add:own') {
    const cpf = cpfDigits(o.cpf); if (!cpfOk(cpf)) return toast('CPF inválido. Confira os números.', 1);
    if (!telOk(o.phone) || !telOk(o.whatsapp)) return toast('Celular ou WhatsApp inválido. Use DDD + número.', 1);
    r = await sb.rpc('admin_register_cpf', ownerParams(o, cpf));
    if (!r.error) {
      const newId = r.data;
      if (f.dataset.nested === '1') { S.owners.push({ id: newId, name: o.name, cpf_mask: '***.***.***-' + cpf.slice(-2), claimed_by: null, expected_email: o.email || null, phone: o.phone || null, whatsapp: o.whatsapp || null }); popModal({ id: newId }); return toast('Proprietário cadastrado e selecionado.'); }
      let falha = null;   // a residência é opcional: vincula todas as que estiverem na lista
      for (const rr of (o.res_ids || '').split(',').filter(Boolean)) { const l = await sb.rpc('admin_link_cpf', { p_cpf: newId, p_res: rr }); if (l.error) falha = l; }
      r = falha || { error: null };
    }
  }
  else if (id === 'edit:own') {
    const cpf = cpfDigits(o.cpf || ''); if (cpf && !cpfOk(cpf)) return toast('CPF inválido. Confira os números.', 1);
    if (!telOk(o.phone) || !telOk(o.whatsapp)) return toast('Celular ou WhatsApp inválido. Use DDD + número.', 1);
    r = await sb.rpc('admin_update_cpf', { p_id: f.dataset.id, ...ownerParams(o, null), p_cpf: cpf || null });
    if (!r.error && 'res_ids' in o) {   // vínculos: grava a diferença entre a lista de antes e a de agora (a lista não existe quando o proprietário é editado a partir de uma residência)
      const antes = S.links.filter(l => l.cpf_id === f.dataset.id).map(l => l.residence_id), depois = (o.res_ids || '').split(',').filter(Boolean); let falha = null;
      for (const rr of depois.filter(x => !antes.includes(x))) { const l = await sb.rpc('admin_link_cpf', { p_cpf: f.dataset.id, p_res: rr }); if (l.error) falha = l; }
      for (const rr of antes.filter(x => !depois.includes(x))) { const l = await sb.rpc('admin_unlink_cpf', { p_cpf: f.dataset.id, p_res: rr }); if (l.error) falha = l; }
      if (falha) r = falha;
    }
    if (!r.error && nested) { await loadOwners(); popModal({ id: f.dataset.id }); return toast('Proprietário salvo.'); }
  }
  else if (id === 'add:docs') { const file = f.file.files[0]; delete o.file; const path = `${rid}/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`; r = await sb.storage.from('documents').upload(path, file); if (!r.error) r = await sb.from('documents').insert({ ...o, path }); }
  else if (id === 'add:qr') r = await sb.from('qr_codes').insert({ residence_id: rid, label: o.label, target_hash: QR_T[o.target] });
  else if (id === 'add:pl') { const file = f.file.files[0], path = `${rid}/planta_${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`; r = await sb.storage.from('documents').upload(path, file); if (!r.error) r = await sb.from('floorplans').insert({ residence_id: rid, title: o.title, path }); }
  else if (id === 'add:pt') r = await sb.from('plan_points').insert({ ...o, residence_id: S.curPlan.residence_id, floorplan_id: S.curPlan.id, x: S.pend.x, y: S.pend.y });
  else if (op === 'add') r = await sb.from(k).insert(o);
  else if (op === 'edit') r = await sb.from(k).update(o).eq('id', f.dataset.id);
  if (r && r.error) return toast('Não foi possível salvar: ' + r.error.message, 1);
  closeModal(); toast('Salvo com sucesso.'); await render();
});
