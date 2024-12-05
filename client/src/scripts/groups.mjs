// Criar grupo e adicionar membros
function createGroup(groupName, members) {
    const groupId = generateGroupId(); // Gerar um ID único para o grupo
    const group = { groupId, groupName, members: [...members] };
  
    // Gerar chave compartilhada para o grupo
    createGroupSharedSecret(group);
    storeGroupData(group); // Armazenar no localStorage
    return group;
}
  
// Gerar chave compartilhada para o grupo
async function createGroupSharedSecret(group) {
    const keyPair = await createKeyPair(); // Gerar chave para o grupo
    const groupPublicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  
    // Para cada membro, calcular a chave compartilhada
    group.members.forEach(async (memberId) => {
        const memberData = getUserData(memberId);
        if (memberData) {
            const publicKey = await window.crypto.subtle.importKey("jwk", memberData.publicKey, { name: "ECDH", namedCurve: "P-256" }, true, []);
            const sharedSecret = await createSharedSecret(keyPair.privateKey, publicKey);
            memberData.groupSecret = new Uint8Array(sharedSecret);
            storeSharedSecret(memberId, sharedSecret);
        }
    });
}
  
// Adicionar membro ao grupo
function addMemberToGroup(groupId, userId) {
    const group = getGroupData(groupId);
    if (group && !group.members.includes(userId)) {
      group.members.push(userId);
      storeGroupData(group);
      createGroupSharedSecret(group); // Gerar a chave compartilhada novamente
    }
}
  
// Remover membro do grupo e gerar nova chave compartilhada
function removeMemberFromGroup(groupId, userId) {
    const group = getGroupData(groupId);
    if (group && group.members.includes(userId)) {
      group.members = group.members.filter(member => member !== userId);
      storeGroupData(group);
  
      // Gerar nova chave compartilhada para o grupo após a remoção do membro
      createGroupSharedSecret(group);
    }
}
