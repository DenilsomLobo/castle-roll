/* Shared validation: the browser and server use the same player identity. */
(function(root){
  function normalize(value) {
    if(typeof value!=='string')throw new Error('Informe seu nome.');
    if(value.length>200||/[\u0000-\u001f\u007f]/u.test(value))throw new Error('Nome inválido.');
    const name=value.normalize('NFKC').trim().replace(/\s+/g,' ');
    if(name.length<2||name.length>20)throw new Error('Use de 2 a 20 caracteres no nome.');
    if(!/^[\p{L}\p{N} _-]+$/u.test(name))throw new Error('Use letras, números, espaços, hífen ou sublinhado.');
    const key=name.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR');
    return {name,key};
  }
  if(typeof module!=='undefined')module.exports={normalize};
  else root.CastlePlayerName={normalize};
})(globalThis);
