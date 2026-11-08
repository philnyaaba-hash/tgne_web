/* LandLedger — encrypted buyer document vault */
'use strict';

const CLIENT_VAULT_ITERATIONS = 310000;
const CLIENT_VAULT_MAX_FILE_SIZE = 2 * 1024 * 1024;
const CLIENT_VAULT_SENTINEL = 'LandLedger client vault · 1';

function vaultBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function vaultBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function vaultCryptoAvailable() {
  return Boolean(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
}

async function deriveClientVaultKey(passphrase, salt) {
  const source = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: CLIENT_VAULT_ITERATIONS, hash: 'SHA-256' },
    source,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptVaultBytes(key, bytes, context) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const algorithm = { name: 'AES-GCM', iv };
  if (context) algorithm.additionalData = new TextEncoder().encode(context);
  const encrypted = await window.crypto.subtle.encrypt(algorithm, key, bytes);
  return { iv: vaultBase64(iv), ciphertext: vaultBase64(new Uint8Array(encrypted)) };
}

async function decryptVaultBytes(key, iv, ciphertext, context) {
  const algorithm = { name: 'AES-GCM', iv: vaultBytes(iv) };
  if (context) algorithm.additionalData = new TextEncoder().encode(context);
  return new Uint8Array(await window.crypto.subtle.decrypt(
    algorithm,
    key,
    vaultBytes(ciphertext)
  ));
}

function buyerVaultSectionHTML(buyerId) {
  const configured = Boolean(data.clientVault && data.clientVault.salt);
  const pinConfigured = configured && data.clientVault.credentialType === 'pin';
  const unlocked = Boolean(state.clientVaultKey);
  const docs = (data.clientDocuments || []).filter((doc) => doc.buyerId === buyerId);
  const actions = unlocked
    ? '<button type="button" class="btn btn-ghost btn-sm" data-action="lock-client-vault">' + icon('shield', 13) + ' Lock vault</button><button type="button" class="btn btn-primary btn-sm" data-action="upload-client-documents">' + icon('plus', 13) + ' Add documents</button>'
    : '<button type="button" class="btn btn-soft btn-sm" data-action="unlock-client-vault" data-buyer-id="' + esc(buyerId) + '">' + icon(configured ? 'shield' : 'lock', 13) + ' ' + (pinConfigured ? 'Unlock vault' : configured ? 'Upgrade to PIN' : 'Set up vault') + '</button>';
  const body = unlocked
    ? docs.length
      ? '<div class="vault-doc-list">' + docs.map((doc) => {
          const meta = state.clientVaultCache[doc.id];
          return meta
            ? '<div class="vault-doc-row"><span class="vault-doc-icon">' + icon(meta.type === 'application/pdf' ? 'file' : 'image', 14) + '</span><span class="vault-doc-copy"><strong>' + esc(meta.name) + '</strong><small>' + esc(fmtBytes(meta.size)) + ' · Added ' + esc(fmtDate(meta.createdAt)) + '</small></span><button type="button" class="mini-btn" data-action="download-client-document" data-doc-id="' + esc(doc.id) + '" title="Download decrypted document">' + icon('download', 13) + '</button><button type="button" class="mini-btn" data-action="delete-client-document" data-doc-id="' + esc(doc.id) + '" title="Delete encrypted document">' + icon('trash', 13) + '</button></div>'
            : '<div class="vault-doc-row"><span class="vault-doc-icon">' + icon('shield', 14) + '</span><span class="vault-doc-copy"><strong>Encrypted document</strong><small>Metadata unavailable</small></span></div>';
        }).join('') + '</div>'
      : '<div class="vault-empty"><span>' + icon('shield', 17) + '</span><strong>No documents in this vault yet</strong><small>Images and PDFs are encrypted on this device before they are saved.</small></div>'
    : '<div class="vault-locked-copy"><span class="vault-lock-icon">' + icon('shield', 17) + '</span><div><strong>' + (configured ? 'Documents are locked with AES-256 encryption' : 'Create a private, encrypted client document vault') + '</strong><small>Files and filenames stay encrypted in this browser until you unlock the workspace vault.</small></div></div>';
  return '<section class="client-vault-section" id="buyerVaultSection"><div class="vault-head"><div class="vault-title"><span class="vault-title-icon">' + icon('shield', 15) + '</span><div><h4>Client document vault</h4><p>' + (unlocked ? docs.length + ' protected document' + (docs.length === 1 ? '' : 's') : pinConfigured ? 'Encrypted records · six-digit PIN' : configured ? 'Encrypted records · PIN upgrade available' : 'Encrypted records · six-digit PIN') + '</p></div></div><div class="vault-head-actions">' + actions + '</div></div>' +
    body +
    '<p class="vault-warning">' + icon('info', 12) + ' ' + (configured && !pinConfigured ? 'Keep the existing passphrase until the PIN upgrade is complete.' : 'Forgetting the PIN means encrypted documents cannot be recovered. Keep an encrypted backup in a safe place.') + '</p>' +
    (unlocked ? '<input type="file" id="clientVaultFileInput" accept="application/pdf,image/jpeg,image/png,image/webp,image/gif" multiple hidden>' : '') +
  '</section>';
}

function refreshBuyerVaultSection() {
  const section = $('#buyerVaultSection');
  if (!section) return;
  const buyerId = state.clientVaultBuyerId;
  if (!buyerId) return;
  section.outerHTML = buyerVaultSectionHTML(buyerId);
  initIcons($('#buyerVaultSection'));
}

function openClientVaultUnlock(buyerId) {
  if (!vaultCryptoAvailable()) { toast('Encrypted document storage is unavailable in this browser context. Open this app in a secure browser context.', 'error'); return; }
  if (data.clientVault && (!data.clientVault.salt || !data.clientVault.verifierIv || !data.clientVault.verifierCiphertext)) {
    toast('Vault settings are incomplete. Do not remove or edit the encrypted vault data.', 'error');
    return;
  }
  state.clientVaultBuyerId = buyerId;
  const configured = Boolean(data.clientVault && data.clientVault.salt);
  state.clientVaultIntent = !configured ? 'setup' : data.clientVault.credentialType === 'pin' ? 'unlock' : 'upgrade';
  const setup = state.clientVaultIntent === 'setup';
  const upgrade = state.clientVaultIntent === 'upgrade';
  openModal({
    title: setup ? 'Set up the client vault PIN' : upgrade ? 'Upgrade the client vault' : 'Unlock the client vault',
    subtitle: setup ? 'Create one six-digit PIN to unlock encrypted documents for every buyer.' : upgrade ? 'Enter the current passphrase once, then set a six-digit PIN. Existing documents will be re-encrypted.' : 'Enter the six-digit PIN to access encrypted buyer documents.',
    size: 'small',
    body: '<form id="client-vault-form" novalidate>' +
      '<div class="vault-security-note">' + icon('shield', 15) + '<span>Files and filenames remain encrypted with AES-256-GCM. Your PIN is never stored, but six digits provide less protection than a long passphrase if browser data is stolen.</span></div>' +
      (upgrade ? '<div class="field"><label for="vaultCurrentPassphrase">Current workspace passphrase</label><input id="vaultCurrentPassphrase" type="password" autocomplete="current-password" required autofocus placeholder="Enter your existing passphrase"><span class="error"></span></div>' : '') +
      '<div class="field"' + (upgrade ? ' style="margin-top:12px"' : '') + '><label for="vaultPin">' + (setup || upgrade ? 'New six-digit PIN' : 'Vault PIN') + '</label><input id="vaultPin" type="password" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" minlength="6" required' + (setup || upgrade ? '' : ' autofocus') + ' placeholder="Enter 6 digits"><span class="error"></span></div>' +
      (setup || upgrade ? '<div class="field" style="margin-top:12px"><label for="vaultPinConfirm">Confirm PIN</label><input id="vaultPinConfirm" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{6}" maxlength="6" minlength="6" required placeholder="Re-enter the PIN"><span class="error"></span></div>' : '') +
      (setup || upgrade ? '<p class="vault-pin-warning">There is no PIN reset. If you forget it, the encrypted documents cannot be recovered. Keep an encrypted backup in a safe place.</p>' : '') +
    '</form>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button type="submit" form="client-vault-form" class="btn btn-primary">' + icon('shield', 14) + (setup ? ' Create PIN vault' : upgrade ? ' Upgrade to PIN' : ' Unlock vault') + '</button>'
  });
}

async function submitClientVaultPassphrase() {
  const pinInput = $('#vaultPin');
  const pin = pinInput ? pinInput.value : '';
  if (!/^\d{6}$/.test(pin)) { fieldError(pinInput, 'Enter a six-digit PIN.'); return; }
  clearFieldErrors($('#client-vault-form'));
  try {
    if (state.clientVaultIntent === 'setup') {
      const confirm = $('#vaultPinConfirm');
      if (!confirm || pin !== confirm.value) { fieldError(confirm, 'The PINs do not match.'); return; }
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveClientVaultKey(pin, salt);
      const verifier = await encryptVaultBytes(key, new TextEncoder().encode(CLIENT_VAULT_SENTINEL));
      const previousVault = data.clientVault;
      data.clientVault = { version: 2, credentialType: 'pin', kdf: 'PBKDF2-SHA-256', iterations: CLIENT_VAULT_ITERATIONS, salt: vaultBase64(salt), verifierIv: verifier.iv, verifierCiphertext: verifier.ciphertext };
      if (!Array.isArray(data.clientDocuments)) data.clientDocuments = [];
      const result = S.save(data);
      if (!result.ok) {
        data.clientVault = previousVault;
        handleSaveResult(result);
        return;
      }
      state.clientVaultKey = key;
      state.clientVaultCache = {};
      closeModal();
      openBuyerDetail(state.clientVaultBuyerId);
      toast('Encrypted client vault created.');
      return;
    }

    const config = data.clientVault;
    if (!config || !config.salt || !config.verifierIv || !config.verifierCiphertext) {
      toast('Vault settings are incomplete. Do not remove or edit the encrypted vault data.', 'error');
      return;
    }
    if (state.clientVaultIntent === 'upgrade') {
      const oldPassphrase = $('#vaultCurrentPassphrase');
      const oldValue = oldPassphrase ? oldPassphrase.value : '';
      if (!oldValue) { fieldError(oldPassphrase, 'Enter the current vault passphrase.'); return; }
      const confirm = $('#vaultPinConfirm');
      if (!confirm || pin !== confirm.value) { fieldError(confirm, 'The PINs do not match.'); return; }
      await upgradeClientVaultToPin(oldValue, pin);
      return;
    }
    const key = await deriveClientVaultKey(pin, vaultBytes(config.salt));
    const check = await decryptVaultBytes(key, config.verifierIv, config.verifierCiphertext);
    if (new TextDecoder().decode(check) !== CLIENT_VAULT_SENTINEL) {
      toast('The PIN is incorrect.', 'error');
      return;
    }
    const cache = {};
    for (const doc of (data.clientDocuments || [])) {
      const bytes = await decryptVaultBytes(key, doc.metadataIv, doc.metadataCiphertext, 'client-doc:' + doc.buyerId + ':' + doc.id + ':metadata');
      cache[doc.id] = JSON.parse(new TextDecoder().decode(bytes));
    }
    state.clientVaultKey = key;
    state.clientVaultCache = cache;
    closeModal();
    openBuyerDetail(state.clientVaultBuyerId);
    toast('Client vault unlocked.');
  } catch (error) {
    if (state.clientVaultIntent === 'unlock') toast('Could not unlock the vault. Check the PIN or restore the complete encrypted backup.', 'error');
    else if (state.clientVaultIntent === 'upgrade') toast('Could not upgrade the vault. Check the current passphrase and encrypted backup.', 'error');
    else toast('Could not create the encrypted vault. Please try again.', 'error');
  }
}

async function upgradeClientVaultToPin(oldPassphrase, pin) {
  const config = data.clientVault;
  const oldKey = await deriveClientVaultKey(oldPassphrase, vaultBytes(config.salt));
  const verifier = await decryptVaultBytes(oldKey, config.verifierIv, config.verifierCiphertext);
  if (new TextDecoder().decode(verifier) !== CLIENT_VAULT_SENTINEL) {
    toast('The current passphrase is incorrect.', 'error');
    return;
  }
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const newKey = await deriveClientVaultKey(pin, salt);
  const migrated = [];
  const cache = {};
  for (const doc of (data.clientDocuments || [])) {
    const context = 'client-doc:' + doc.buyerId + ':' + doc.id + ':';
    const file = await decryptVaultBytes(oldKey, doc.fileIv, doc.ciphertext, context + 'file');
    const metadataBytes = await decryptVaultBytes(oldKey, doc.metadataIv, doc.metadataCiphertext, context + 'metadata');
    const metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
    const encryptedFile = await encryptVaultBytes(newKey, file, context + 'file');
    const encryptedMetadata = await encryptVaultBytes(newKey, metadataBytes, context + 'metadata');
    migrated.push(Object.assign({}, doc, {
      fileIv: encryptedFile.iv,
      ciphertext: encryptedFile.ciphertext,
      metadataIv: encryptedMetadata.iv,
      metadataCiphertext: encryptedMetadata.ciphertext
    }));
    cache[doc.id] = metadata;
  }
  const encryptedVerifier = await encryptVaultBytes(newKey, new TextEncoder().encode(CLIENT_VAULT_SENTINEL));
  const previousVault = data.clientVault;
  const previousDocuments = data.clientDocuments;
  data.clientVault = {
    version: 2,
    credentialType: 'pin',
    kdf: 'PBKDF2-SHA-256',
    iterations: CLIENT_VAULT_ITERATIONS,
    salt: vaultBase64(salt),
    verifierIv: encryptedVerifier.iv,
    verifierCiphertext: encryptedVerifier.ciphertext
  };
  data.clientDocuments = migrated;
  const result = S.save(data);
  if (!result.ok) {
    data.clientVault = previousVault;
    data.clientDocuments = previousDocuments;
    handleSaveResult(result);
    return;
  }
  state.clientVaultKey = newKey;
  state.clientVaultCache = cache;
  closeModal();
  openBuyerDetail(state.clientVaultBuyerId);
  toast('Vault upgraded to PIN protection. Existing documents were re-encrypted.');
}

function lockClientVault(silent) {
  const wasUnlocked = Boolean(state.clientVaultKey);
  state.clientVaultKey = null;
  state.clientVaultCache = {};
  state.clientVaultIntent = null;
  refreshBuyerVaultSection();
  if (wasUnlocked && !silent) toast('Client vault locked.');
}

async function encryptClientDocument(file, buyerId) {
  const key = state.clientVaultKey;
  if (!key) throw new Error('Unlock the client vault before adding documents.');
  const id = S.uid('vaultdoc-');
  const context = 'client-doc:' + buyerId + ':' + id + ':';
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const encryptedFile = await encryptVaultBytes(key, fileBytes, context + 'file');
  const metadata = {
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: new Date().toISOString()
  };
  const encryptedMetadata = await encryptVaultBytes(key, new TextEncoder().encode(JSON.stringify(metadata)), context + 'metadata');
  return {
    id,
    buyerId,
    fileIv: encryptedFile.iv,
    ciphertext: encryptedFile.ciphertext,
    metadataIv: encryptedMetadata.iv,
    metadataCiphertext: encryptedMetadata.ciphertext
  };
}

async function addClientDocuments(files) {
  if (!state.clientVaultKey || !state.clientVaultBuyerId) { toast('Unlock the client vault first.', 'warn'); return; }
  const picked = Array.from(files || []);
  if (!picked.length) return;
  const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const invalid = picked.find((file) => !validTypes.includes(file.type));
  if (invalid) { toast('Only PDF, JPEG, PNG, WebP and GIF files can be added.', 'warn'); return; }
  const tooLarge = picked.find((file) => file.size > CLIENT_VAULT_MAX_FILE_SIZE);
  if (tooLarge) { toast('Each file must be 2 MB or smaller to fit local encrypted storage.', 'warn'); return; }
  const original = Array.isArray(data.clientDocuments) ? data.clientDocuments : [];
  const additions = [];
  try {
    for (const file of picked) additions.push(await encryptClientDocument(file, state.clientVaultBuyerId));
  } catch (error) {
    toast(error && error.message ? error.message : 'Could not encrypt the selected documents.', 'error');
    return;
  }
  data.clientDocuments = original.concat(additions);
  const result = S.save(data);
  if (!result.ok) {
    data.clientDocuments = original;
    handleSaveResult(result);
    return;
  }
  for (let i = 0; i < additions.length; i++) {
    state.clientVaultCache[additions[i].id] = {
      name: picked[i].name,
      type: picked[i].type,
      size: picked[i].size,
      createdAt: new Date().toISOString()
    };
  }
  refreshBuyerVaultSection();
  toast(additions.length + ' encrypted document' + (additions.length === 1 ? '' : 's') + ' added.');
}

async function downloadClientDocument(docId) {
  if (!state.clientVaultKey) { toast('Unlock the client vault first.', 'warn'); return; }
  const doc = (data.clientDocuments || []).find((item) => item.id === docId);
  const meta = state.clientVaultCache[docId];
  if (!doc || !meta) { toast('Encrypted document not found.', 'error'); return; }
  try {
    const bytes = await decryptVaultBytes(state.clientVaultKey, doc.fileIv, doc.ciphertext, 'client-doc:' + doc.buyerId + ':' + doc.id + ':file');
    const safeName = meta.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || 'client-document';
    const blob = new Blob([bytes], { type: meta.type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    toast('Could not decrypt this document. The file may be damaged.', 'error');
  }
}

function deleteClientDocument(docId) {
  if (!state.clientVaultKey) { toast('Unlock the client vault first.', 'warn'); return; }
  const doc = (data.clientDocuments || []).find((item) => item.id === docId);
  const meta = state.clientVaultCache[docId];
  if (!doc) { toast('Encrypted document not found.', 'error'); return; }
  confirmAction({
    title: 'Delete encrypted document?',
    message: 'Permanently remove ' + (meta ? '"' + meta.name + '"' : 'this document') + ' from the client vault?',
    confirmText: 'Delete document'
  }).then((ok) => {
    if (!ok) return;
    const original = data.clientDocuments;
    data.clientDocuments = original.filter((item) => item.id !== docId);
    const result = S.save(data);
    if (!result.ok) {
      data.clientDocuments = original;
      handleSaveResult(result);
      return;
    }
    delete state.clientVaultCache[docId];
    refreshBuyerVaultSection();
    toast('Encrypted document deleted.');
  });
}
