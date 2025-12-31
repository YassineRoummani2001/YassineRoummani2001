export const USERS = [
    { id: '1', name: 'Me', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&fit=crop&q=80', isMe: true, stories: [] },
    {
        id: '2',
        name: 'Haris',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&fit=crop&q=80',
        hasStories: true,
        isLive: true,
        stories: [
            { id: 's1', image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=800&fit=crop&q=80', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() }, // 2 hours ago
        ]
    },
    {
        id: '3',
        name: 'Abdullah',
        avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&fit=crop&q=80',
        hasStories: true,
        stories: [
            { id: 's2', image: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=800&fit=crop&q=80', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() }, // 5 hours ago
        ]
    },
    {
        id: '4',
        name: 'Sienna',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&fit=crop&q=80',
        hasStories: true,
        stories: [
            { id: 's3', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&fit=crop&q=80', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString() }, // 23 hours ago
        ]
    },
    {
        id: '5',
        name: 'Alex',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&fit=crop&q=80',
        hasStories: false,
        stories: []
    },
    {
        id: '6',
        name: 'Jordan',
        avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&fit=crop&q=80',
        hasStories: false,
        stories: []
    },
    {
        id: '7',
        name: 'Expired User',
        avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=200&fit=crop&q=80',
        hasStories: true,
        stories: [
            { id: 's4', image: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=800&fit=crop&q=80', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString() }, // 25 hours ago (Expired)
        ]
    }
];

export const POSTS = [
    {
        id: '1',
        user: USERS[3], // Sienna
        timeAgo: '1H ago',
        caption: 'More fresh new travel content Inso for all you travel bloggers or creators working but as ... More',
        image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&fit=crop&q=80',
        likes: '26K',
        comments: '1K',
        shares: '381',
        isVideo: true,
        videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    },
    {
        id: '2',
        user: { id: '7', name: 'Esther Howard', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&fit=crop&q=80' },
        timeAgo: '4H ago',
        caption: 'Hiking through the amazons with the best crew! 🌲',
        image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&fit=crop&q=80',
        likes: '12K',
        comments: '450',
        shares: '120',
        isVideo: false,
    },
];

export const REELS = [
    {
        id: '1',
        user: USERS[3], // Sienna
        caption: "Bangladesh's First Love",
        likes: '2,600',
        comments: '1,000',
        shares: '500',
        videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', // Placeholder video
    },
    {
        id: '2',
        user: USERS[2],
        caption: "Nature is amazing!",
        likes: '50K',
        comments: '10K',
        shares: '4.5K',
        videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    },
];

export const PROFILE = {
    user: {
        name: 'Brooklyn Simmons',
        handle: '@Broo65dx',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&fit=crop&q=80',
        bio: '🔥 Top UI/UX Inspiration\n🔥 Best resources and guide',
        posts: '400',
        followers: '128.6K',
        following: '600',
        likes: '4.8M',
        coverImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fit=crop&q=80',
    },
    images: [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1511576661531-b34d7da5d0bb?w=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&fit=crop&q=80',
        'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&fit=crop&q=80',
    ]
};
