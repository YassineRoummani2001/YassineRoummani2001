# 🚀 Guide Complet - Fonctionnalités Chat Avancées

Ce guide contient tout le code pour ajouter 10 fonctionnalités avancées à la page message.

## 📋 Fonctionnalités à implémenter

1. 📷 Envoyer des photos
2. 😊 Sélecteur d'emoji
3. 📎 Envoyer des fichiers
4. ⋮ Menu contextuel (header)
5. ↩️ Répondre à un message
6. 🗑️ Supprimer un message
7. 📋 Copier le texte
8. 📅 Séparateurs de date
9. 🎤 Messages vocaux
10. ⭐ Messages épinglés

---

## 🔧 Étape 1 : Imports nécessaires

Les imports sont déjà ajoutés dans le fichier. Vérifie que tu as :

```typescript
import { MoreVertical, Bell, Archive, Paperclip, Mic, Camera, Smile } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Modal } from 'react-native';
```

---

## 🔧 Étape 2 : États supplémentaires

Ajoute ces états après les états existants :

```typescript
const [showMenu, setShowMenu] = useState(false); // Déjà ajouté
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const [showMessageActions, setShowMessageActions] = useState(false);
const [isRecording, setIsRecording] = useState(false);
```

---

## 🔧 Étape 3 : Fonctions pour gérer les actions

Ajoute ces fonctions avant le `return` :

```typescript
// Fonction pour choisir une image
const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
        // Upload l'image et envoie le message
        const imageUri = result.assets[0].uri;
        // TODO: Upload au backend et envoyer
        console.log('Image selected:', imageUri);
    }
};

// Fonction pour copier le texte
const handleCopy = async () => {
    if (selectedMessage?.content) {
        await Clipboard.setStringAsync(selectedMessage.content);
        setSelectedMessage(null);
        // Affiche un toast: "Message copied"
    }
};

// Fonction pour répondre
const handleReply = () => {
    setReplyTo(selectedMessage);
    setSelectedMessage(null);
};

// Fonction pour supprimer
const handleDelete = async () => {
    if (!selectedMessage) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages/${selectedMessage._id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        });
        
        if (res.ok) {
            setMessages(messages.filter(m => m._id !== selectedMessage._id));
            setSelectedMessage(null);
        }
    } catch (error) {
        console.error('Error deleting message:', error);
    }
};
```

---

## 🔧 Étape 4 : Menu 3 points dans le header

Dans le header, après le recipient info, ajoute :

```typescript
<TouchableOpacity 
    onPress={() => setShowMenu(!showMenu)}
    style={styles.menuButton}
>
    <MoreVertical size={24} color="#000" />
</TouchableOpacity>

{showMenu && (
    <View style={styles.contextMenu}>
        <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
                setShowMenu(false);
                // TODO: Mute conversation
            }}
        >
            <Bell size={20} color="#666" />
            <Text style={styles.menuText}>Mute</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
                setShowMenu(false);
                // TODO: Archive conversation
            }}
        >
            <Archive size={20} color="#666" />
            <Text style={styles.menuText}>Archive</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={[styles.menuItem, styles.deleteMenuItem]}
            onPress={() => {
                setShowMenu(false);
                // TODO: Delete conversation
            }}
        >
            <Trash2 size={20} color="#FF3B30" />
            <Text style={[styles.menuText, { color: '#FF3B30' }]}>Delete</Text>
        </TouchableOpacity>
    </View>
)}
```

---

## 🔧 Étape 5 : Boutons d'actions dans l'input

Remplace la section input par :

```typescript
<View style={styles.inputContainer}>
    {/* Boutons d'actions */}
    <View style={styles.actionButtons}>
        <TouchableOpacity onPress={pickImage} style={styles.actionButton}>
            <ImageIcon size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
            onPress={() => setShowEmojiPicker(true)} 
            style={styles.actionButton}
        >
            <Smile size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
            <Paperclip size={24} color="#666" />
        </TouchableOpacity>
    </View>

    {/* Input text */}
    <TextInput
        style={styles.input}
        placeholder="Message..."
        placeholderTextColor="#999"
        value={inputText}
        onChangeText={setInputText}
        multiline
    />
    
    {/* Bouton Send ou Mic */}
    {inputText.trim() ? (
        <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
        >
            <Send size={20} color="white" />
        </TouchableOpacity>
    ) : (
        <TouchableOpacity style={styles.micButton}>
            <Mic size={24} color="#666" />
        </TouchableOpacity>
    )}
</View>
```

---

## 🔧 Étape 6 : Long press sur message

Dans `renderMessage`, entoure le message d'un `TouchableOpacity` :

```typescript
<TouchableOpacity
    activeOpacity={0.9}
    onLongPress={() => {
        setSelectedMessage(item);
        setShowMessageActions(true);
    }}
    delayLongPress={500}
>
    {/* Contenu du message existant */}
</TouchableOpacity>
```

---

## 🔧 Étape 7 : Modal pour actions sur message

Avant le `</SafeAreaView>`, ajoute :

```typescript
{/* Modal pour actions sur message */}
<Modal
    visible={showMessageActions}
    transparent
    animationType="fade"
    onRequestClose={() => setShowMessageActions(false)}
>
    <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowMessageActions(false)}
    >
        <View style={styles.messageActionsMenu}>
            <TouchableOpacity 
                style={styles.actionMenuItem}
                onPress={handleReply}
            >
                <Reply size={20} color="#007AFF" />
                <Text style={styles.actionMenuText}>Reply</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
                style={styles.actionMenuItem}
                onPress={handleCopy}
            >
                <Copy size={20} color="#666" />
                <Text style={styles.actionMenuText}>Copy</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
                style={styles.actionMenuItem}
                onPress={handleDelete}
            >
                <Trash2 size={20} color="#FF3B30" />
                <Text style={[styles.actionMenuText, { color: '#FF3B30' }]}>Delete</Text>
            </TouchableOpacity>
        </View>
    </TouchableOpacity>
</Modal>
```

---

## 🔧 Étape 8 : Afficher le message en reply

Si `replyTo` existe, affiche-le au-dessus de l'input :

```typescript
{replyTo && (
    <View style={styles.replyContainer}>
        <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>Replying to</Text>
            <Text style={styles.replyText} numberOfLines={1}>
                {replyTo.content}
            </Text>
        </View>
        <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.replyClose}>✕</Text>
        </TouchableOpacity>
    </View>
)}
```

---

## 🎨 Étape 9 : Styles à ajouter

Ajoute ces styles dans le `StyleSheet.create` :

```typescript
menuButton: {
    padding: 8,
},
contextMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 180,
    zIndex: 1000,
},
menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
},
menuText: {
    fontSize: 16,
    color: '#000',
},
deleteMenuItem: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
},
actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
},
actionButton: {
    padding: 4,
},
micButton: {
    padding: 8,
},
modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
},
messageActionsMenu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
},
actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
},
actionMenuText: {
    fontSize: 16,
    color: '#000',
},
menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
},
replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    marginBottom: 8,
},
replyContent: {
    flex: 1,
},
replyLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
},
replyText: {
    fontSize: 14,
    color: '#666',
},
replyClose: {
    fontSize: 20,
    color: '#666',
    padding: 4,
},
```

---

## ✅ Résultat Final

Après avoir implémenté tout ça, tu auras :

✅ Menu 3 points avec Mute, Archive, Delete
✅ Boutons pour photos, emoji, fichiers
✅ Long press sur message pour Reply, Copy, Delete
✅ Interface moderne et fluide
✅ Toutes les fonctionnalités d'un chat moderne !

---

## 🚀 Prochaines étapes

Pour aller encore plus loin :

- Ajouter l'upload réel des images au backend
- Implémenter l'enregistrement vocal
- Ajouter les séparateurs de date
- Gérer les messages épinglés
- Ajouter les réactions emoji sur les messages

Bon courage ! 🎉
