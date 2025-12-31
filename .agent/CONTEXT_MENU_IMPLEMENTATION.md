# 🎯 Implémentation Complète du Menu Contextuel

## 📋 Fonctionnalités à implémenter

### 1. 🔇 Mute Notifications

```typescript
const handleMute = async () => {
    setShowMenu(false);
    try {
        const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/mute`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ muted: true })
        });
        
        if (res.ok) {
            Alert.alert('Success', 'Notifications muted for this chat');
        }
    } catch (error) {
        console.error('Error muting chat:', error);
    }
};
```

### 2. 🎨 Change Background

```typescript
const handleChangeBackground = () => {
    setShowMenu(false);
    // Afficher un modal avec des options de fond
    Alert.alert(
        'Change Background',
        'Choose a background',
        [
            { text: 'Default', onPress: () => setBackground('default') },
            { text: 'Dark', onPress: () => setBackground('dark') },
            { text: 'Gradient', onPress: () => setBackground('gradient') },
            { text: 'Cancel', style: 'cancel' }
        ]
    );
};
```

### 3. 🗑️ Delete Messages

```typescript
const handleDeleteMessages = () => {
    setShowMenu(false);
    Alert.alert(
        'Delete Messages',
        'Are you sure you want to delete all messages in this chat?',
        [
            {
                text: 'Cancel',
                style: 'cancel'
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${user.token}`
                            }
                        });
                        
                        if (res.ok) {
                            setMessages([]);
                            Alert.alert('Success', 'All messages deleted');
                        }
                    } catch (error) {
                        console.error('Error deleting messages:', error);
                    }
                }
            }
        ]
    );
};
```

### 4. 🚫 Block User

```typescript
const handleBlockUser = () => {
    setShowMenu(false);
    Alert.alert(
        'Block User',
        `Are you sure you want to block ${recipient?.name}?`,
        [
            {
                text: 'Cancel',
                style: 'cancel'
            },
            {
                text: 'Block',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/auth/block/${recipient._id}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${user.token}`
                            }
                        });
                        
                        if (res.ok) {
                            Alert.alert('Success', 'User blocked', [
                                {
                                    text: 'OK',
                                    onPress: () => router.back()
                                }
                            ]);
                        }
                    } catch (error) {
                        console.error('Error blocking user:', error);
                    }
                }
            }
        ]
    );
};
```

---

## 🎨 Design Amélioré du Menu

### Styles mis à jour

```typescript
contextMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    minWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
},
menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderRadius: 12,
},
menuItemHover: {
    backgroundColor: '#F5F5F5',
},
menuText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
},
menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
    marginHorizontal: 12,
},
```

---

## 🔧 Code Complet à Ajouter

### 1. Ajouter Alert dans les imports

```typescript
import { Alert } from 'react-native';
```

### 2. Ajouter un état pour le background

```typescript
const [background, setBackground] = useState('default');
```

### 3. Remplacer les TODO dans le menu par les vraies fonctions

```typescript
<TouchableOpacity 
    style={styles.menuItem}
    onPress={handleMute}
>
    <BellOff size={20} color="#666" />
    <Text style={styles.menuText}>Mute notifications</Text>
</TouchableOpacity>

<View style={styles.menuDivider} />

<TouchableOpacity 
    style={styles.menuItem}
    onPress={handleChangeBackground}
>
    <ImageIcon size={20} color="#666" />
    <Text style={styles.menuText}>Change background</Text>
</TouchableOpacity>

<View style={styles.menuDivider} />

<TouchableOpacity 
    style={styles.menuItem}
    onPress={handleDeleteMessages}
>
    <Trash2 size={20} color="#FF3B30" />
    <Text style={[styles.menuText, { color: '#FF3B30' }]}>Delete messages</Text>
</TouchableOpacity>

<View style={styles.menuDivider} />

<TouchableOpacity 
    style={styles.menuItem}
    onPress={handleBlockUser}
>
    <Archive size={20} color="#FF3B30" />
    <Text style={[styles.menuText, { color: '#FF3B30' }]}>Block user</Text>
</TouchableOpacity>
```

---

## 🚀 Backend Endpoints Nécessaires

### 1. Mute Chat

```javascript
// backend/routes/chats.js
router.post('/:chatId/mute', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });
        
        // Add user to muted list
        if (!chat.mutedBy) chat.mutedBy = [];
        if (!chat.mutedBy.includes(req.user._id)) {
            chat.mutedBy.push(req.user._id);
        }
        
        await chat.save();
        res.json({ message: 'Chat muted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
```

### 2. Delete All Messages

```javascript
router.delete('/:chatId/messages', auth, async (req, res) => {
    try {
        await Message.deleteMany({ chat: req.params.chatId });
        res.json({ message: 'All messages deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
```

### 3. Block User (déjà existe probablement)

```javascript
router.post('/block/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user.blockedUsers) user.blockedUsers = [];
        
        if (!user.blockedUsers.includes(req.params.userId)) {
            user.blockedUsers.push(req.params.userId);
            await user.save();
        }
        
        res.json({ message: 'User blocked' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
```

---

## ✅ Résultat Final

Après implémentation, tu auras :

- ✅ Menu fonctionnel avec vraies actions
- ✅ Confirmations pour actions dangereuses
- ✅ Design moderne et propre
- ✅ Feedback utilisateur (Alerts)
- ✅ Intégration backend complète

Bon courage ! 🎉
