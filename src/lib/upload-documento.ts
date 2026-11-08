// Progress covers browser -> server. Storage confirmation is a separate phase.
export function uploadDocumento(data: FormData, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/externos/documentos');
    request.timeout = 120000;
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round(event.loaded / event.total * 100)));
    };
    request.upload.onload = () => onProgress(100);
    request.onload = () => {
      let result;
      try { result = JSON.parse(request.responseText); } catch { reject(new Error('No se pudo confirmar la carga. Revisa los documentos antes de reintentar.')); return; }
      if (request.status >= 200 && request.status < 300 && result.ok) resolve();
      else reject(new Error(result.error || 'No se pudo guardar el documento.'));
    };
    request.onerror = () => reject(new Error('Se perdió la conexión. Revisa los documentos antes de reintentar.'));
    request.ontimeout = () => reject(new Error('La carga tardó demasiado. Revisa los documentos antes de reintentar.'));
    request.send(data);
  });
}
