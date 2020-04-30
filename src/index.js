const rp = require('request-promise');

class YoutubeApiClient {
    constructor(api_key) {
        this.api_key = api_key
        this.base_url = 'https://www.googleapis.com/youtube/v3'
        this.search_url = this.base_url + '/search'
        this.video_url = this.base_url + '/videos'
        this.channel_url = this.base_url + '/channels'
        this.search_params = {
            part: 'snippet',
            type: 'video',
            safeSearch: 'none',
            maxResults: 5,
            order: 'relevance',
            key: this.api_key
        }
        this.video_params = {
            part: 'statistics',
            key: this.api_key
        }
        this.channel_params = {
            part: 'snippet,statistics'
        }
    }
    
    async search(query, options) {
        const qs = Object.assign(this.search_params, options);
        
        const requestOptions = {
            qs: {
                ...qs,
                q: query
            },
            method: 'GET',
            uri: this.search_url,
            transform: (body) => {
                return JSON.parse(body).items.map(i => this.transformSearchItem(i));
            }
        }

        try {
            return await rp(requestOptions);
        } catch (err) {
            throw new Error(err);
        }
    }

    async getVideo(id) {
        const requestOptions = {
            qs: {
                ...this.video_params,
                id
            },
            uri: this.video_url,
            method: 'GET',
            transform: body => {
                return this.transformVideoItem(JSON.parse(body));
            }
        }

        try {
            return await rp(requestOptions)
        } catch (err) {
            throw new Error(err);
        }
    }

    async searchVerbose(query, options) {
        try {

            const items = await this.search(query, options);

            // Loop through each item and get its metadata
            return await Promise.all(items.map(item => {
                    return this.getVideo(item.id)
                        .then(data => {
                            return {
                                ...data,
                                ...item
                            }
                        })
                        .catch(err => {
                            console.log(err);
                        })
                }))
                .then(data => {
                    return data;
                })
                .catch(err => {
                    console.log(err);
                })

        } catch (err) {
            throw new Error(err);
        }
    }

    async getChannel(username) {
        const requestOptions = {
            qs: {
                ...this.channel_params,
                forUsername: username,
                key: this.api_key
            },
            method: 'GET',
            uri: 'https://www.googleapis.com/youtube/v3/channels',
            transform: body => {
                return this.transformChannelItem(JSON.parse(body).items[0]);
            }
        }

        try {
            return await rp(requestOptions)
        } catch (err) {
            throw new Error(err)
        }
    }

    transformSearchItem(item) {
        const { id, snippet } = item;

        return {
            id: id.videoId,
            title: snippet.title,
            image: snippet.thumbnails.medium.url,
            author: snippet.channelTitle,
            url: `https://www.youtube.com/watch?v=${id.videoId}`,
            type: 'video'
        }
    }

    transformVideoItem(item) {
        return {
            views: parseInt(item.items[0].statistics.viewCount),
            likes: parseInt(item.items[0].statistics.likeCount),
            dislikes: parseInt(item.items[0].statistics.dislikeCount),
            comments: parseInt(item.items[0].statistics.commentCount),
            type: 'video'
        }
    }

    transformChannelItem(channel) {
        return {
            id: channel.id,
            description: channel.snippet.description,
            title: channel.snippet.title,
            followers: channel.statistics.subscriberCount,
            posts: channel.statistics.videoCount,
            handle: channel.snippet.title,
            name: channel.snippet.title,
            following: null,
            image: channel.snippet.thumbnails.default.url
        }
    }
}

module.exports = YoutubeApiClient;