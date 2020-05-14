const rp = require('request-promise');

class YoutubeApiClient {
    constructor(api_key) {
        this.api_key = api_key
        this.base_url = 'https://www.googleapis.com/youtube/v3'
        this.search_url = this.base_url + '/search'
        this.video_url = this.base_url + '/videos'
        this.channel_url = this.base_url + '/channels'
        this.videos_url = this.base_url + '/playlistItems'
        this.search_params = {
            part: 'snippet',
            type: 'video',
            safeSearch: 'none',
            maxResults: 5,
            order: 'relevance',
            key: this.api_key
        }
        this.video_params = {
            part: 'snippet,statistics',
            key: this.api_key
        }
        this.channel_params = {
            part: 'snippet,statistics,contentDetails'
        }
        this.videos_params = {
            part: 'contentDetails',
            maxResults: 5
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

    async getVideos(ids) {
        try {
            return await Promise.all(ids.map(id => {
                return this.getVideo(id)
                    .then(data => {
                        return {
                            ...data,
                            id
                        }
                    })
                    .catch(err => console.log(err))
            }))
        } catch (err) {
            throw new Error(err);
        }
    }

    async searchVerbose(query, options) {
        try {

            const ids = await this.search(query, options);

            // Loop through each item and get its metadata
            return await this.getVideos(ids);

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
            uri: this.channel_url,
            transform: body => {
                return this.transformChannelItem(JSON.parse(body).items[0]);
            }
        }

        try {
            return await rp(requestOptions)
        } catch (err) {
            try {
                return await this.getChannelById(username);
            } catch (err) {
                console.log('Doesn\'t exist');
            }
        }
    }

    async getChannelById(id) {
        const requestOptions = {
            qs: {
                ...this.channel_params,
                id: id,
                key: this.api_key
            },
            method: 'GET',
            uri: this.channel_url,
            transform: body => {
                return this.transformChannelItem(JSON.parse(body).items[0]);
            }
        }

        try {
            return await rp(requestOptions)
        } catch (err) {
            console.log('Doesn\'t exist.')
        }
    }

    async getChannelVideosList(username, id) {
        const requestOptions = {
            qs: {
                ...this.videos_params,
                key: this.api_key,
                forUsername: username,
                playlistId: id
            },
            method: 'GET',
            uri: this.videos_url,
            transform: body => {
                return this.transformChannelVideoListItems(JSON.parse(body).items)
            }
        }
        
        try {
            return await rp(requestOptions)
        } catch (err) {
            throw new Error(err)
        }
    }

    async getChannelVerbose(username) {
        try {
            var channel_info = await this.getChannel(username);
            var video_ids = await this.getChannelVideosList(username, channel_info.videos_id);

            const videos = await this.getVideos(video_ids);

            return {
                user: channel_info,
                posts: videos
            };
        } catch (err) {
            throw new Error(err)
        }
    }

    transformSearchItem(item) {
        return item.id.videoId
    }

    transformVideoItem(item) {
        return {
            views: parseInt(item.items[0].statistics.viewCount),
            likes: parseInt(item.items[0].statistics.likeCount),
            dislikes: parseInt(item.items[0].statistics.dislikeCount),
            comments: parseInt(item.items[0].statistics.commentCount),
            title: item.items[0].snippet.title,
            image: item.items[0].snippet.thumbnails.medium.url,
            url: `https://youtube.com/watch?v=${item.items[0].id}`,
            type: 'video',
            author: item.items[0].snippet.channelTitle
        }
    }

    transformChannelItem(channel) {
        return {
            id: channel.id,
            description: channel.snippet.description,
            followers: channel.statistics.subscriberCount,
            posts: channel.statistics.videoCount,
            handle: channel.snippet.title,
            name: channel.snippet.title,
            following: null,
            image: channel.snippet.thumbnails.default.url,
            videos_id: channel.contentDetails.relatedPlaylists.uploads,
            url: `https://www.youtube.com/user/${channel.snippet.title}`
        }
    }

    transformChannelVideoListItems(videos) {
        return videos.map(video => {
            return video.contentDetails.videoId
        })
    }

}

module.exports = YoutubeApiClient;