const rp = require('request-promise');

class YoutubeApiClient {
    constructor(api_key) {
        this.api_key = api_key
        this.base_url = 'https://www.googleapis.com/youtube/v3'
        this.search_url = this.base_url + '/search'
        this.video_url = this.base_url + '/videos'
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

    transformSearchItem(item) {
        const { id, snippet } = item;

        return {
            id: id.videoId,
            title: snippet.title,
            image: snippet.thumbnails.medium.url,
            author: snippet.channelTitle,
            url: `https://www.youtube.com/watch?v=${id.videoId}`
        }
    }

    transformVideoItem(item) {
        return {
            views: parseInt(item.items[0].statistics.viewCount),
            likes: parseInt(item.items[0].statistics.likeCount),
            dislikes: parseInt(item.items[0].statistics.dislikeCount),
            comments: parseInt(item.items[0].statistics.commentCount)
        }
    }
}

module.exports = YoutubeApiClient;